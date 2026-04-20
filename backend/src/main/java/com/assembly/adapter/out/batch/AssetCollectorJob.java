package com.assembly.adapter.out.batch;

import com.assembly.application.asset.port.out.AssetPort;
import com.assembly.application.member.port.out.MemberPort;
import com.assembly.domain.asset.Asset;
import com.assembly.domain.member.Member;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 공직자 재산신고 PDF를 파싱하여 Asset 테이블에 저장하는 배치 Job.
 *
 * 실행 방법: POST /api/v1/admin/batch/assets?pdfPath=/path/to/재산신고내역.pdf
 * - 국회의원 의원 이름 → monaCd 매핑을 MemberPort로 구성
 * - 이미 해당 연도 데이터가 존재하면 스킵 (중복 방지)
 * - 금액: PDF는 천원 단위, DB(Asset)는 만원 단위 → /10 변환
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AssetCollectorJob {


    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final MemberPort memberPort;
    private final AssetPort assetPort;
    private final ObjectMapper objectMapper;

    @Bean
    public Job collectAssetsJob() {
        return new JobBuilder("collectAssetsJob", jobRepository)
                .start(collectAssetsStep())
                .build();
    }

    @Bean
    public Step collectAssetsStep() {
        return new StepBuilder("collectAssetsStep", jobRepository)
                .tasklet(assetsTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet assetsTasklet() {
        return (contribution, chunkContext) -> {
            String pdfPath = (String) chunkContext.getStepContext()
                    .getJobParameters().get("pdfPath");
            if (pdfPath == null || pdfPath.isBlank()) {
                throw new IllegalArgumentException("JobParameter 'pdfPath'가 필요합니다");
            }
            Long declareYearParam = (Long) chunkContext.getStepContext()
                    .getJobParameters().get("declareYear");
            int declareYear = (declareYearParam != null) ? declareYearParam.intValue() : 2025;

            log.info("재산 PDF 파싱 시작: {}, 신고연도: {}", pdfPath, declareYear);

            // 1. 이름 → monaCd 맵 구성
            Map<String, String> nameToMonaCd = buildNameMap();
            log.info("활성 의원 {}명 로드", nameToMonaCd.size());

            // 2. PDF 파싱
            List<AssetPdfParser.MemberAssetData> parsed = AssetPdfParser.parse(pdfPath);
            log.info("PDF 파싱 결과: {}명", parsed.size());

            int saved = 0, skipped = 0, notFound = 0;

            for (AssetPdfParser.MemberAssetData data : parsed) {
                String monaCd = nameToMonaCd.get(data.name());
                if (monaCd == null) {
                    log.debug("의원 미매칭: {}", data.name());
                    notFound++;
                    continue;
                }

                if (assetPort.existsByMonaCdAndDeclareYear(monaCd, declareYear)) {
                    skipped++;
                    continue;
                }

                try {
                    Asset asset = buildAsset(monaCd, data, declareYear);
                    assetPort.save(asset);
                    saved++;
                } catch (Exception e) {
                    log.error("저장 실패: name={}, monaCd={}, 오류={}", data.name(), monaCd, e.getMessage());
                }
            }

            log.info("재산 데이터 수집 완료: 저장={}, 스킵={}, 미매칭={}", saved, skipped, notFound);
            return RepeatStatus.FINISHED;
        };
    }

    private Map<String, String> buildNameMap() {
        List<Member> members = memberPort.searchActive(null, null);
        Map<String, String> map = new HashMap<>();
        for (Member m : members) {
            map.put(m.getName(), m.getMonaCd());
        }
        return map;
    }

    private Asset buildAsset(String monaCd, AssetPdfParser.MemberAssetData data, int declareYear) throws Exception {
        // 천원 → 만원 변환
        BigDecimal totalManwon = cheonToManwon(data.totalCheonwon());

        // 카테고리별 금액 추출
        BigDecimal land     = BigDecimal.ZERO;
        BigDecimal building = BigDecimal.ZERO;
        BigDecimal deposit  = BigDecimal.ZERO;
        BigDecimal stock    = BigDecimal.ZERO;
        BigDecimal debt     = BigDecimal.ZERO;

        for (AssetPdfParser.CategoryData cat : data.categories()) {
            String name = cat.name();
            BigDecimal amount = cheonToManwon(cat.amountCheonwon());
            if (name.contains("토지"))      { land     = land.add(amount); }
            else if (name.contains("건물")) { building = building.add(amount); }
            else if (name.contains("예금")) { deposit  = deposit.add(amount); }
            else if (name.contains("증권") || name.contains("주식") || name.contains("채권")) {
                stock = stock.add(amount);
            } else if (name.contains("채무")) { debt = debt.add(amount); }
        }

        // rawData JSON 구성 (천원 그대로 보존)
        List<Map<String, Object>> catList = data.categories().stream()
                .map(c -> {
                    List<Map<String, Object>> itemList = c.items().stream()
                            .map(it -> Map.<String, Object>of(
                                    "relation", it.relation(),
                                    "desc", it.desc(),
                                    "amountCheonwon", it.amountCheonwon()
                            ))
                            .toList();
                    return Map.<String, Object>of(
                            "name", c.name(),
                            "count", c.count(),
                            "amountCheonwon", c.amountCheonwon(),
                            "items", itemList
                    );
                })
                .toList();
        String rawData = objectMapper.writeValueAsString(Map.of("categories", catList));

        return Asset.builder()
                .monaCd(monaCd)
                .declareYear(declareYear)
                .totalAmount(totalManwon)
                .landAmount(land)
                .buildingAmount(building)
                .depositAmount(deposit)
                .stockAmount(stock)
                .debtAmount(debt)
                .rawData(rawData)
                .build();
    }

    private static BigDecimal cheonToManwon(long cheonwon) {
        if (cheonwon == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(cheonwon).divide(BigDecimal.TEN);
    }
}
