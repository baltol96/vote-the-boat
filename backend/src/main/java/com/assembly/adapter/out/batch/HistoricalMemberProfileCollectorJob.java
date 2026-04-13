package com.assembly.adapter.out.batch;

import com.assembly.adapter.out.persistence.member.MemberJpaRepository;
import com.assembly.domain.member.Member;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 열린국회정보 역대국회의원현황(nprlapfmaufmqytet) API에서 전기 정보(학력·경력·취미·저서·상훈 등)를 수집하여
 * 기존 Member 엔티티의 bio 필드에 업데이트하는 배치 Job.
 *
 * 매핑 전략: NAME(이름) 기준으로 기존 Member 조회.
 *  - 1건 매핑 → 바로 업데이트
 *  - 동명이인(복수 매핑) → 생년 앞 4자리(BIRTH)로 추가 필터링
 *  - 여전히 복수 → 경고 로그 후 스킵
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class HistoricalMemberProfileCollectorJob {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final RestClient assemblyRestClient;
    private final MemberJpaRepository memberJpaRepository;

    @Value("${assembly.current-term}")
    private int currentAssemblyTerm;

    private static final int PAGE_SIZE = 100;
    private static final String ENDPOINT = "/nprlapfmaufmqytet";

    @Bean
    public Job collectHistoricalProfilesJob() {
        return new JobBuilder("collectHistoricalProfilesJob", jobRepository)
                .start(collectHistoricalProfilesStep())
                .build();
    }

    @Bean
    public Step collectHistoricalProfilesStep() {
        return new StepBuilder("collectHistoricalProfilesStep", jobRepository)
                .tasklet(historicalProfileTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet historicalProfileTasklet() {
        return (contribution, chunkContext) -> {
            int updated = 0;
            int skipped = 0;

            for (int daesu = 1; daesu <= currentAssemblyTerm; daesu++) {
                List<Map<String, Object>> records = fetchAllRecords(daesu);
                for (Map<String, Object> record : records) {
                    if (applyBioToMember(record)) updated++;
                    else skipped++;
                }
                log.info("대수 {} 처리 완료 ({}건 업데이트, {}건 스킵)", daesu, updated, skipped);
            }

            log.info("역대의원 프로필 수집 완료: 총 {}건 업데이트, {}건 스킵", updated, skipped);
            return RepeatStatus.FINISHED;
        };
    }

    // ── API 조회 ─────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchAllRecords(int daesu) {
        List<Map<String, Object>> all = new ArrayList<>();
        int page = 1;
        while (true) {
            List<Map<String, Object>> batch = fetchPage(daesu, page++);
            if (batch.isEmpty()) break;
            all.addAll(batch);
        }
        return all;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchPage(int daesu, int page) {
        try {
            final int d = daesu;
            final int p = page;
            Map<String, Object> response = assemblyRestClient.get()
                    .uri(u -> u.path(ENDPOINT)
                            .queryParam("DAESU", d)
                            .queryParam("pIndex", p)
                            .queryParam("pSize", PAGE_SIZE)
                            .build())
                    .retrieve()
                    .body(Map.class);

            if (response == null) return List.of();

            for (Object value : response.values()) {
                if (value instanceof List<?> outer) {
                    for (Object item : outer) {
                        if (item instanceof Map<?, ?> m && m.containsKey("row")) {
                            return (List<Map<String, Object>>) m.get("row");
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("역대의원 API 조회 실패 (daesu={}, page={}): {}", daesu, page, e.getMessage());
        }
        return List.of();
    }

    // ── 매핑·업데이트 ────────────────────────────────────────────────────────

    private boolean applyBioToMember(Map<String, Object> record) {
        String name = str(record, "NAME");
        if (name == null || name.isBlank()) return false;

        List<Member> candidates = memberJpaRepository.findByName(name);
        if (candidates.isEmpty()) return false;

        Member target;
        if (candidates.size() == 1) {
            target = candidates.get(0);
        } else {
            // 동명이인: BIRTH 앞 4자리(연도)로 필터
            String birthStr = str(record, "BIRTH");
            String birthYear = birthStr != null && birthStr.length() >= 4
                    ? birthStr.substring(0, 4) : null;

            if (birthYear != null) {
                String by = birthYear;
                List<Member> filtered = candidates.stream()
                        .filter(m -> m.getBirthDate() != null
                                && String.valueOf(m.getBirthDate().getYear()).equals(by))
                        .toList();
                if (filtered.size() == 1) {
                    target = filtered.get(0);
                } else {
                    log.warn("동명이인 매핑 불가 - 이름: {}, BIRTH: {}", name, birthStr);
                    return false;
                }
            } else {
                log.warn("동명이인 필터 불가(생년 없음) - 이름: {}", name);
                return false;
            }
        }

        target.updateBio(
                trunc(str(record, "NAME_HAN"), 60),
                trunc(str(record, "BON"),      60),
                trunc(str(record, "POSI"),     60),
                str(record, "HAK"),
                str(record, "HOBBY"),
                str(record, "BOOK"),
                str(record, "SANG"),
                trunc(str(record, "DEAD"), 100),
                trunc(str(record, "URL"),  255)
        );
        memberJpaRepository.save(target);
        return true;
    }

    private String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isBlank() ? null : s;
    }

    private String trunc(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
