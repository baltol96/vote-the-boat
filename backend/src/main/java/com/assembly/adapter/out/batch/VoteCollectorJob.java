package com.assembly.adapter.out.batch;

import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.member.port.out.MemberPort;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class VoteCollectorJob {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final VotePort votePort;
    private final BillPort billPort;
    private final MemberPort memberPort;
    private final RestClient assemblyRestClient;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd HHmmss");
    private static final int PAGE_SIZE = 1000;
    private static final int CHUNK_SIZE = 1000;
    private static final int THREAD_COUNT = 8;

    private record BillRef(String billId, String age) {}

    @Bean
    public Job collectVotesJob() {
        return new JobBuilder("collectVotesJob", jobRepository)
                .start(collectVotesStep())
                .build();
    }

    @Bean
    public Step collectVotesStep() {
        return new StepBuilder("collectVotesStep", jobRepository)
                .<Map<String, Object>, Vote>chunk(CHUNK_SIZE, transactionManager)
                .reader(voteItemReader(null))
                .processor(voteItemProcessor(null))
                .writer(voteItemWriter())
                .taskExecutor(voteTaskExecutor())
                .faultTolerant()
                .retry(Exception.class)
                .retryLimit(3)
                .build();
    }

    @Bean
    public TaskExecutor voteTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(THREAD_COUNT);
        executor.setMaxPoolSize(THREAD_COUNT);
        executor.setQueueCapacity(CHUNK_SIZE * THREAD_COUNT);
        executor.setThreadNamePrefix("vote-batch-");
        executor.initialize();
        return executor;
    }

    /**
     * skipDuplicateCheck: 테이블을 초기화 후 재수집 시 true로 설정하면
     * 항목마다 DB 조회하는 중복 체크를 건너뛰어 속도가 크게 향상됨.
     */
    @Bean
    @StepScope
    public ItemReader<Map<String, Object>> voteItemReader(
            @Value("#{jobParameters['skipDuplicateCheck']}") String skipDuplicateCheck) {
        return new VotesByBillReader(assemblyRestClient, billPort, memberPort);
    }

    @Bean
    @StepScope
    public ItemProcessor<Map<String, Object>, Vote> voteItemProcessor(
            @Value("#{jobParameters['skipDuplicateCheck']}") String skipParam) {
        boolean skipDuplicateCheck = "true".equalsIgnoreCase(skipParam);
        Set<String> activeMemberMonaCds = new HashSet<>(memberPort.findAllActiveMonaCds());
        log.info("현역의원 필터 {}명 로드 완료 (중복체크 스킵: {})", activeMemberMonaCds.size(), skipDuplicateCheck);

        return item -> {
            String monaCd = (String) item.get("MONA_CD");
            String billNo = (String) item.get("BILL_NO");
            if (monaCd == null || billNo == null) return null;
            if (!activeMemberMonaCds.contains(monaCd)) return null;
            if (!skipDuplicateCheck && votePort.existsByMonaCdAndBillNo(monaCd, billNo)) return null;

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
                    .age((String) item.get("AGE"))
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

    // 현역의원이 속한 대수별 bill을 순회하는 커스텀 ItemReader (thread-safe)
    @SuppressWarnings("unchecked")
    static class VotesByBillReader implements ItemReader<Map<String, Object>> {

        private final RestClient restClient;
        private final BillPort billPort;
        private final MemberPort memberPort;

        private Iterator<BillRef> billRefIterator;
        private BillRef currentBillRef;
        private int currentPage;
        private Iterator<Map<String, Object>> rowIterator;
        private boolean exhausted = false;

        VotesByBillReader(RestClient restClient, BillPort billPort, MemberPort memberPort) {
            this.restClient = restClient;
            this.billPort = billPort;
            this.memberPort = memberPort;
        }

        @Override
        public synchronized Map<String, Object> read() {
            if (exhausted) return null;

            // 초기화: 현역의원의 대수별 bill 목록 구성
            if (billRefIterator == null) {
                List<Integer> activeTerms = memberPort.findDistinctTermNumbersByActiveMembers();
                List<BillRef> billRefs = new ArrayList<>();
                for (Integer term : activeTerms) {
                    String age = String.valueOf(term);
                    List<String> ids = billPort.findAllBillIdsByAge(age);
                    for (String id : ids) {
                        billRefs.add(new BillRef(id, age));
                    }
                }
                log.info("표결 수집 대상 의안 {}건 (대수: {})", billRefs.size(), activeTerms);
                billRefIterator = billRefs.iterator();
                if (!billRefIterator.hasNext()) { exhausted = true; return null; }
                advanceToBill();
            }

            while (true) {
                if (rowIterator != null && rowIterator.hasNext()) {
                    return rowIterator.next();
                }

                List<Map<String, Object>> page = fetchPage(currentBillRef, ++currentPage);
                if (!page.isEmpty()) {
                    rowIterator = page.iterator();
                    continue;
                }

                if (!billRefIterator.hasNext()) { exhausted = true; return null; }
                advanceToBill();
            }
        }

        private void advanceToBill() {
            currentBillRef = billRefIterator.next();
            currentPage = 0;
            rowIterator = null;
        }

        private List<Map<String, Object>> fetchPage(BillRef billRef, int page) {
            try {
                Map<String, Object> response = restClient.get()
                        .uri(u -> u.path("/nojepdqqaweusdfbi")
                                .queryParam("BILL_ID", billRef.billId())
                                .queryParam("AGE", billRef.age())
                                .queryParam("pIndex", page)
                                .queryParam("pSize", PAGE_SIZE)
                                .build())
                        .retrieve()
                        .body(Map.class);

                if (response == null) return List.of();
                if (response.containsKey("RESULT")) return List.of();
                return extractRows(response);
            } catch (Exception e) {
                log.warn("표결 API 호출 실패 billId={} age={} page={}: {}",
                        billRef.billId(), billRef.age(), page, e.getMessage());
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
