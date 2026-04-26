package com.assembly.adapter.out.batch;

import com.assembly.application.governor.port.out.LocalGovernorPort;
import com.assembly.domain.governor.LocalGovernor;
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
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Wikidata SPARQL로 한국 현직 지자체장 사진 URL 수집.
 * Wikimedia Commons Special:FilePath URL을 photo_url에 저장.
 * 실행: POST /api/v1/admin/batch/governor-photos
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class WikidataGovernorPhotoJob {

    private static final String SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
    private static final String USER_AGENT = "VoteTheBoat/1.0 (baltolly@gmail.com)";
    private static final Set<String> GOVERNOR_KEYWORDS = Set.of("시장", "도지사", "군수", "구청장");

    private static final String SPARQL_QUERY = """
            SELECT DISTINCT ?personLabel (MIN(?img) AS ?image) ?positionLabel
            WHERE {
              ?person p:P39 ?stmt .
              ?stmt ps:P39 ?position .
              ?position wdt:P17 wd:Q884 .
              FILTER NOT EXISTS { ?stmt pq:P582 ?endDate }
              ?person wdt:P18 ?img .
              SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en" . }
            }
            GROUP BY ?personLabel ?positionLabel
            """;

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final LocalGovernorPort localGovernorPort;

    @Bean
    public Job collectGovernorPhotosJob() {
        return new JobBuilder("collectGovernorPhotosJob", jobRepository)
                .start(wikidataGovernorPhotoStep())
                .build();
    }

    @Bean
    public Step wikidataGovernorPhotoStep() {
        return new StepBuilder("wikidataGovernorPhotoStep", jobRepository)
                .tasklet(wikidataGovernorPhotoTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet wikidataGovernorPhotoTasklet() {
        return (contribution, chunkContext) -> {
            RestClient client = RestClient.create();

            URI sparqlUri = UriComponentsBuilder.fromHttpUrl(SPARQL_ENDPOINT)
                    .queryParam("query", SPARQL_QUERY)
                    .queryParam("format", "json")
                    .encode()
                    .build()
                    .toUri();

            Map<String, Object> response;
            try {
                String body = client.get()
                        .uri(sparqlUri)
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "application/sparql-results+json")
                        .retrieve()
                        .body(String.class);
                if (body == null || body.isBlank()) {
                    log.warn("Wikidata 응답 body가 비어있음");
                    return RepeatStatus.FINISHED;
                }
                response = new ObjectMapper().readValue(body, new TypeReference<>() {});
            } catch (Exception e) {
                log.error("Wikidata SPARQL 호출 실패: {}", e.getMessage());
                return RepeatStatus.FINISHED;
            }

            if (response == null) {
                log.warn("Wikidata 응답이 null");
                return RepeatStatus.FINISHED;
            }

            List<Map<String, Object>> bindings = extractBindings(response);
            log.info("Wikidata 응답 총 {}건, 지자체장 필터링 중...", bindings.size());

            List<LocalGovernor> allGovernors = localGovernorPort.findAll();
            Map<String, LocalGovernor> governorByName = new java.util.HashMap<>();
            for (LocalGovernor g : allGovernors) {
                governorByName.put(g.getName(), g);
            }

            int updated = 0, skipped = 0;

            for (Map<String, Object> binding : bindings) {
                String positionLabel = extractValue(binding, "positionLabel");
                if (!isGovernorPosition(positionLabel)) {
                    skipped++;
                    continue;
                }

                String name = extractValue(binding, "personLabel");
                String imageUrl = extractValue(binding, "image");

                if (name == null || imageUrl == null) continue;

                LocalGovernor governor = governorByName.get(name);
                if (governor == null) {
                    log.debug("매핑 안됨: {} ({})", name, positionLabel);
                    continue;
                }

                governor.updatePhotoUrl(imageUrl);
                localGovernorPort.save(governor);
                log.info("사진 업데이트: {} / {} → {}", name, positionLabel, imageUrl);
                updated++;
            }

            log.info("Wikidata 지자체장 사진 수집 완료: 업데이트={}, 스킵={}", updated, skipped);
            return RepeatStatus.FINISHED;
        };
    }

    private boolean isGovernorPosition(String positionLabel) {
        if (positionLabel == null) return false;
        return GOVERNOR_KEYWORDS.stream().anyMatch(positionLabel::contains);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractBindings(Map<String, Object> response) {
        Object results = response.get("results");
        if (results instanceof Map<?, ?> resultsMap) {
            Object bindings = resultsMap.get("bindings");
            if (bindings instanceof List<?> list) {
                return (List<Map<String, Object>>) list;
            }
        }
        return List.of();
    }

    private String extractValue(Map<String, Object> binding, String key) {
        Object entry = binding.get(key);
        if (entry instanceof Map<?, ?> map) {
            Object value = map.get("value");
            return value != null ? value.toString() : null;
        }
        return null;
    }
}
