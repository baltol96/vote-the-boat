package com.assembly.adapter.out.batch;

import com.assembly.adapter.out.persistence.district.DistrictCodeMappingRepository;
import com.assembly.adapter.out.persistence.member.MemberTermRepository;
import com.assembly.application.member.port.out.MemberPort;
import com.assembly.domain.district.DistrictCodeMapping;
import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberStatus;
import com.assembly.domain.member.MemberTerm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MemberCollectorJob {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final MemberPort memberPort;
    private final RestClient assemblyRestClient;
    private final DistrictCodeMappingRepository districtCodeMappingRepository;
    private final MemberTermRepository memberTermRepository;

    // 23대 전환 시 이 값만 변경
    private static final int CURRENT_ASSEMBLY_TERM = 22;

    private static final DateTimeFormatter BIRTH_FMT_DASH    = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter BIRTH_FMT_COMPACT = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 대수별 term 상세 정보 */
    record TermDetail(String party, String district, String electionType, String sggCode) {}

    /** 배치 처리 단위 DTO — processor → writer 간 전달 */
    record MemberBatchItem(
            String monaCd,
            String name,
            LocalDate birthDate,
            String gender,
            String photoUrl,
            String email,
            String phone,
            String officeRoom,
            MemberStatus status,
            Integer assemblyTerm,
            // 대수 번호 → 상세 정보 (party/district/electionType/sggCode)
            Map<Integer, TermDetail> termDetails
    ) {}

    @Bean
    public Job collectMembersJob() {
        return new JobBuilder("collectMembersJob", jobRepository)
                .start(collectMembersStep())
                .build();
    }

    @Bean
    public Step collectMembersStep() {
        return new StepBuilder("collectMembersStep", jobRepository)
                .<Map<String, Object>, MemberBatchItem>chunk(100, transactionManager)
                .reader(memberItemReader())
                .processor(memberItemProcessor())
                .writer(memberItemWriter())
                .faultTolerant()
                .retry(Exception.class)
                .retryLimit(3)
                .build();
    }

    @Bean
    @StepScope
    public ItemReader<Map<String, Object>> memberItemReader() {
        return new AssemblyApiReader<>(assemblyRestClient, "/ALLNAMEMBER");
    }

    @Bean
    @StepScope
    public ItemProcessor<Map<String, Object>, MemberBatchItem> memberItemProcessor() {
        // Step 시작 시 매핑 테이블 전체 로드 (253건, 메모리 부담 없음)
        List<DistrictCodeMapping> mappings = districtCodeMappingRepository.findAll();

        return item -> {
            String monaCd = (String) item.get("NAAS_CD");
            if (monaCd == null || monaCd.isBlank()) return null;

            String gteltEraco = (String) item.get("GTELT_ERACO");
            boolean isCurrent = isCurrentAssemblyMember(gteltEraco, CURRENT_ASSEMBLY_TERM);
            List<Integer> allTermNumbers = parseAllTermNumbers(gteltEraco);

            // API는 party/district/electionType을 "21대값/22대값" 형태로 대수 순서대로 반환
            // allTermNumbers 순서와 1:1 대응하여 각 대수별 상세 정보를 Map으로 구성
            String[] parties     = splitBySlash((String) item.get("PLPT_NM"));
            String[] districts   = splitBySlash((String) item.get("ELECD_NM"));
            String[] elecTypes   = splitBySlash((String) item.get("ELECD_DIV_NM"));

            Map<Integer, TermDetail> termDetails = new HashMap<>();
            for (int i = 0; i < allTermNumbers.size(); i++) {
                Integer termNumber = allTermNumbers.get(i);
                String party      = trunc(get(parties,   i), 50);
                String district   = trunc(get(districts, i), 100);
                String elecType   = trunc(get(elecTypes, i), 20);
                String sggCode    = null;
                if (termNumber.equals(CURRENT_ASSEMBLY_TERM)) {
                    sggCode = trunc(resolveSggCode(district, mappings), 20);
                    if (sggCode == null && district != null && isCurrent) {
                        log.warn("sggCode 미매핑 선거구: '{}' (monaCd={})", district, monaCd);
                    }
                }
                termDetails.put(termNumber, new TermDetail(party, district, elecType, sggCode));
            }

            return new MemberBatchItem(
                    monaCd,
                    trunc((String) item.get("NAAS_NM"), 20),
                    parseBirthDate((String) item.get("BIRDY_DT")),
                    trunc((String) item.get("NTR_DIV"), 10),
                    trunc((String) item.get("NAAS_PIC"), 255),
                    trunc((String) item.get("NAAS_EMAIL_ADDR"), 255),
                    trunc((String) item.get("NAAS_TEL_NO"), 50),
                    trunc((String) item.get("OFFM_RNUM_NO"), 20),
                    isCurrent ? MemberStatus.ACTIVE : MemberStatus.INACTIVE,
                    isCurrent ? CURRENT_ASSEMBLY_TERM : null,
                    termDetails
            );
        };
    }

    /**
     * GTELT_ERACO(당선대수) 필드에 targetTerm이 포함되면 현역으로 판단.
     * 예: "제21대, 제22대" → 숫자만 추출 → ["21","22"] → 22 포함 → true
     */
    private boolean isCurrentAssemblyMember(String gteltEraco, int targetTerm) {
        if (gteltEraco == null || gteltEraco.isBlank()) return false;
        String target = String.valueOf(targetTerm);
        return Arrays.stream(gteltEraco.split(","))
                .map(t -> t.replaceAll("[^0-9]", "")) // "제22대" → "22"
                .anyMatch(target::equals);
    }

    /**
     * GTELT_ERACO에서 모든 당선 대수를 파싱하여 반환.
     * 예: "제21대, 제22대" → [21, 22]
     */
    private List<Integer> parseAllTermNumbers(String gteltEraco) {
        if (gteltEraco == null || gteltEraco.isBlank()) return List.of();
        return Arrays.stream(gteltEraco.split(","))
                .map(t -> t.replaceAll("[^0-9]", ""))
                .filter(t -> !t.isBlank())
                .map(Integer::parseInt)
                .toList();
    }

    /**
     * ELECD_NM(API) → sggCode(GeoJSON) 매핑.
     */
    private String resolveSggCode(String elecdNm, List<DistrictCodeMapping> mappings) {
        if (elecdNm == null || elecdNm.isBlank()) return null;

        return mappings.stream()
                .filter(m -> m.getSggNm().equals(elecdNm))
                .map(DistrictCodeMapping::getSggCode)
                .findFirst()
                .orElse(null);
    }

    private LocalDate parseBirthDate(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.matches("^\\d{4}$")) return LocalDate.of(Integer.parseInt(trimmed), 1, 1);
        try {
            return trimmed.contains("-")
                    ? LocalDate.parse(trimmed, BIRTH_FMT_DASH)
                    : LocalDate.parse(trimmed, BIRTH_FMT_COMPACT);
        } catch (DateTimeParseException e) {
            log.warn("생년월일 파싱 실패: {}", value);
            return null;
        }
    }

    private String trunc(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** "A/B/C" → ["A","B","C"], null → [] */
    private String[] splitBySlash(String value) {
        if (value == null || value.isBlank()) return new String[0];
        return Arrays.stream(value.split("/"))
                .map(String::trim)
                .toArray(String[]::new);
    }

    /** 배열 인덱스 안전 접근 — 범위 초과 시 마지막 값 반환 */
    private String get(String[] arr, int index) {
        if (arr == null || arr.length == 0) return null;
        return arr[Math.min(index, arr.length - 1)];
    }

    @Bean
    @StepScope
    public ItemWriter<MemberBatchItem> memberItemWriter() {
        return items -> {
            for (MemberBatchItem item : new ArrayList<>(items.getItems())) {
                Member member = memberPort.findByMonaCd(item.monaCd())
                        .orElse(null);

                if (member == null) {
                    member = memberPort.save(Member.builder()
                            .monaCd(item.monaCd())
                            .name(item.name())
                            .birthDate(item.birthDate())
                            .gender(item.gender())
                            .photoUrl(item.photoUrl())
                            .email(item.email())
                            .phone(item.phone())
                            .officeRoom(item.officeRoom())
                            .status(item.status())
                            .assemblyTerm(item.assemblyTerm())
                            .build());
                } else {
                    member.update(item.name(), item.photoUrl(), item.email(), item.phone(),
                            item.officeRoom(), item.status(), item.assemblyTerm());
                }

                // 모든 당선 대수를 member_terms에 저장 (대수별 party/district/electionType 각각 매핑)
                final Member savedMember = member;
                for (Map.Entry<Integer, TermDetail> entry : item.termDetails().entrySet()) {
                    Integer termNumber = entry.getKey();
                    TermDetail detail  = entry.getValue();
                    memberTermRepository.findByMemberAndTermNumber(savedMember, termNumber)
                            .ifPresentOrElse(
                                    t -> t.update(detail.party(), detail.district(),
                                            detail.electionType(), detail.sggCode()),
                                    () -> memberTermRepository.save(MemberTerm.builder()
                                            .member(savedMember)
                                            .termNumber(termNumber)
                                            .party(detail.party())
                                            .district(detail.district())
                                            .electionType(detail.electionType())
                                            .sggCode(detail.sggCode())
                                            .build())
                            );
                }
            }
            log.info("의원 {}명 저장/갱신 완료", items.size());
        };
    }
}
