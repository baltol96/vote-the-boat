package com.assembly.adapter.out.batch;

import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.vote.port.out.VotePort;
import com.assembly.domain.vote.Vote;
import com.assembly.domain.vote.VoteResult;
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
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class VoteCollectorJob {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final VotePort votePort;
    private final BillPort billPort;
    private final RestClient assemblyRestClient;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd HHmmss");
    private static final int PAGE_SIZE = 100;

    @Bean
    public Job collectVotesJob() {
        return new JobBuilder("collectVotesJob", jobRepository)
                .start(collectVotesStep())
                .build();
    }

    @Bean
    public Step collectVotesStep() {
        return new StepBuilder("collectVotesStep", jobRepository)
                .<Map<String, Object>, Vote>chunk(200, transactionManager)
                .reader(voteItemReader())
                .processor(voteItemProcessor())
                .writer(voteItemWriter())
                .faultTolerant()
                .retry(Exception.class)
                .retryLimit(3)
                .build();
    }

    @Bean
    @StepScope
    public ItemReader<Map<String, Object>> voteItemReader() {
        return new VotesByBillReader(assemblyRestClient, billPort);
    }

    @Bean
    @StepScope
    public ItemProcessor<Map<String, Object>, Vote> voteItemProcessor() {
        return item -> {
            String monaCd = (String) item.get("MONA_CD");
            String billNo = (String) item.get("BILL_NO");
            if (monaCd == null || billNo == null) return null;
            if (votePort.existsByMonaCdAndBillNo(monaCd, billNo)) return null;

            String voteDtStr = (String) item.get("VOTE_DATE");
            LocalDate voteDt = null;
            if (voteDtStr != null) {
                try {
                    voteDt = LocalDate.parse(voteDtStr, DATE_FMT);
                } catch (Exception e) {
                    log.warn("표결일자 파싱 실패: {}", voteDtStr);
                }
            }

            return Vote.builder()
                    .monaCd(monaCd)
                    .billNo(billNo)
                    .billName((String) item.get("BILL_NAME"))
                    .voteDt(voteDt)
                    .result(parseVoteResult((String) item.get("RESULT_VOTE_MOD")))
                    .billId((String) item.get("BILL_ID"))
                    .billUrl((String) item.get("BILL_URL"))
                    .currCommittee((String) item.get("CURR_COMMITTEE"))
                    .build();
        };
    }

    @Bean
    @StepScope
    public ItemWriter<Vote> voteItemWriter() {
        return items -> {
            votePort.saveAll(new ArrayList<>(items.getItems()));
            log.info("표결 {}건 저장 완료", items.size());
        };
    }

    private VoteResult parseVoteResult(String raw) {
        if (raw == null) return VoteResult.ABSENT;
        return switch (raw.trim()) {
            case "찬성" -> VoteResult.YES;
            case "반대" -> VoteResult.NO;
            case "기권" -> VoteResult.ABSTAIN;
            default -> VoteResult.ABSENT;
        };
    }

    // BILL_ID 기반으로 순회하는 커스텀 ItemReader
    @SuppressWarnings("unchecked")
    static class VotesByBillReader implements ItemReader<Map<String, Object>> {

        private final RestClient restClient;
        private final BillPort billPort;

        private Iterator<String> billIdIterator;
        private String currentBillId;
        private int currentPage;
        private Iterator<Map<String, Object>> rowIterator;
        private boolean exhausted = false;

        VotesByBillReader(RestClient restClient, BillPort billPort) {
            this.restClient = restClient;
            this.billPort = billPort;
        }

        @Override
        public Map<String, Object> read() {
            if (exhausted) return null;

            // 초기화
            if (billIdIterator == null) {
                List<String> billIds = billPort.findAllBillIds();
                log.info("표결 수집 대상 의안 {}건", billIds.size());
                billIdIterator = billIds.iterator();
                if (!billIdIterator.hasNext()) { exhausted = true; return null; }
                advanceToBill();
            }

            while (true) {
                // 현재 페이지에서 다음 행 반환
                if (rowIterator != null && rowIterator.hasNext()) {
                    return rowIterator.next();
                }

                // 다음 페이지 fetch
                List<Map<String, Object>> page = fetchPage(currentBillId, ++currentPage);
                if (!page.isEmpty()) {
                    rowIterator = page.iterator();
                    continue;
                }

                // 현재 bill 소진 → 다음 bill로
                if (!billIdIterator.hasNext()) { exhausted = true; return null; }
                advanceToBill();
            }
        }

        private void advanceToBill() {
            currentBillId = billIdIterator.next();
            currentPage = 0;
            rowIterator = null;
        }

        private List<Map<String, Object>> fetchPage(String billId, int page) {
            try {
                Map<String, Object> response = restClient.get()
                        .uri(u -> u.path("/nojepdqqaweusdfbi")
                                .queryParam("BILL_ID", billId)
                                .queryParam("AGE", "22")
                                .queryParam("pIndex", page)
                                .queryParam("pSize", PAGE_SIZE)
                                .build())
                        .retrieve()
                        .body(Map.class);

                if (response == null) return List.of();
                // ERROR / INFO-200(데이터 없음) 처리
                if (response.containsKey("RESULT")) return List.of();

                return extractRows(response);
            } catch (Exception e) {
                log.warn("표결 API 호출 실패 billId={} page={}: {}", billId, page, e.getMessage());
                return List.of();
            }
        }

        private List<Map<String, Object>> extractRows(Map<String, Object> response) {
            for (Object value : response.values()) {
                if (value instanceof List<?> outer) {
                    for (Object item : outer) {
                        if (item instanceof Map<?, ?> m && m.containsKey("row")) {
                            return (List<Map<String, Object>>) m.get("row");
                        }
                    }
                }
            }
            return List.of();
        }
    }
}
