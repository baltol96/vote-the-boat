package com.assembly.adapter.out.batch;

import com.assembly.application.governor.port.out.LocalGovernorPort;
import com.assembly.domain.governor.GovernorType;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 선관위 당선인 정보 API로 지자체장(시도지사·기초단체장) 수집.
 * API가 application/xml 응답을 반환하므로 XML 파싱 처리.
 *
 * sgTypecode=3: 시도지사 17명
 * sgTypecode=4: 기초단체장 226명
 * 실행: POST /api/v1/admin/batch/governors?sgId=20220601
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class GovernorCollectorJob {

    private static final String ENDPOINT =
            "http://apis.data.go.kr/9760000/WinnerInfoInqireService2/getWinnerInfoInqire";
    private static final int PAGE_SIZE = 100;

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final LocalGovernorPort localGovernorPort;

    @Value("${election.api.key}")
    private String electionApiKey;

    @Bean
    public Job collectGovernorsJob() {
        return new JobBuilder("collectGovernorsJob", jobRepository)
                .start(collectGovernorsStep())
                .build();
    }

    @Bean
    public Step collectGovernorsStep() {
        return new StepBuilder("collectGovernorsStep", jobRepository)
                .tasklet(governorsTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet governorsTasklet() {
        return (contribution, chunkContext) -> {
            String sgId = (String) chunkContext.getStepContext()
                    .getJobParameters().get("sgId");
            if (sgId == null || sgId.isBlank()) {
                sgId = "20220601";
            }

            RestClient client = RestClient.create();
            int saved = 0, updated = 0;

            for (String sgTypecode : List.of("3", "4")) {
                GovernorType type = "3".equals(sgTypecode)
                        ? GovernorType.METRO_MAYOR
                        : GovernorType.DISTRICT_HEAD;

                List<Map<String, String>> items = fetchAll(client, sgId, sgTypecode);
                log.info("sgTypecode={} 수집 건수: {}", sgTypecode, items.size());

                for (Map<String, String> item : items) {
                    String huboid = item.get("huboid");
                    if (huboid == null || huboid.isBlank()) {
                        log.warn("huboid 없음, 스킵: {}", item);
                        continue;
                    }

                    LocalGovernor existing = localGovernorPort.findByHuboid(huboid).orElse(null);
                    if (existing != null) {
                        existing.update(
                                item.get("name"),
                                item.get("jdName"),
                                item.get("addr"),
                                item.get("job"),
                                item.get("edu"),
                                item.get("career1"),
                                item.get("career2")
                        );
                        localGovernorPort.save(existing);
                        updated++;
                    } else {
                        LocalGovernor governor = LocalGovernor.builder()
                                .huboid(huboid)
                                .sgId(sgId)
                                .governorType(type)
                                .sdName(item.get("sdName"))
                                .sggName(item.get("sggName"))
                                .wiwName(item.get("wiwName"))
                                .name(item.get("name"))
                                .jdName(item.get("jdName"))
                                .birthday(item.get("birthday"))
                                .gender(item.get("gender"))
                                .addr(item.get("addr"))
                                .job(item.get("job"))
                                .edu(item.get("edu"))
                                .career1(item.get("career1"))
                                .career2(item.get("career2"))
                                .dugsu(item.get("dugsu"))
                                .dugyul(item.get("dugyul"))
                                .build();
                        localGovernorPort.save(governor);
                        saved++;
                    }
                }
            }

            log.info("지자체장 수집 완료: 신규={}, 업데이트={}", saved, updated);
            return RepeatStatus.FINISHED;
        };
    }

    private List<Map<String, String>> fetchAll(RestClient client, String sgId, String sgTypecode) {
        List<Map<String, String>> result = new ArrayList<>();
        int pageNo = 1;

        while (true) {
            String url = UriComponentsBuilder.fromHttpUrl(ENDPOINT)
                    .queryParam("ServiceKey", electionApiKey)
                    .queryParam("sgId", sgId)
                    .queryParam("sgTypecode", sgTypecode)
                    .queryParam("numOfRows", PAGE_SIZE)
                    .queryParam("pageNo", pageNo)
                    .build(true)
                    .toUriString();

            byte[] xmlBytes;
            try {
                xmlBytes = client.get()
                        .uri(url)
                        .retrieve()
                        .body(byte[].class);
            } catch (Exception e) {
                log.error("선관위 API 호출 실패: sgTypecode={}, page={}, 오류={}", sgTypecode, pageNo, e.getMessage());
                break;
            }

            if (xmlBytes == null || xmlBytes.length == 0) break;

            List<Map<String, String>> pageItems;
            int totalCount;
            try {
                Document doc = DocumentBuilderFactory.newInstance()
                        .newDocumentBuilder()
                        .parse(new ByteArrayInputStream(xmlBytes));
                doc.getDocumentElement().normalize();

                totalCount = intText(doc, "totalCount");
                if (totalCount == 0) break;

                pageItems = parseItems(doc);
            } catch (Exception e) {
                log.error("XML 파싱 실패: sgTypecode={}, page={}, 오류={}", sgTypecode, pageNo, e.getMessage());
                break;
            }

            result.addAll(pageItems);
            log.debug("sgTypecode={} page={} items={}/{}", sgTypecode, pageNo, result.size(), totalCount);

            if (result.size() >= totalCount) break;
            pageNo++;
        }

        return result;
    }

    private List<Map<String, String>> parseItems(Document doc) {
        List<Map<String, String>> list = new ArrayList<>();
        NodeList itemNodes = doc.getElementsByTagName("item");
        for (int i = 0; i < itemNodes.getLength(); i++) {
            Element el = (Element) itemNodes.item(i);
            Map<String, String> map = new HashMap<>();
            for (String tag : new String[]{"huboid", "sgId", "sgTypecode", "sggName", "sdName",
                    "wiwName", "giho", "jdName", "name", "hanjaName", "gender", "birthday",
                    "addr", "jobId", "job", "eduId", "edu", "career1", "career2",
                    "dugsu", "dugyul"}) {
                NodeList nodes = el.getElementsByTagName(tag);
                if (nodes.getLength() > 0) {
                    String val = nodes.item(0).getTextContent().trim();
                    if (!val.isEmpty()) map.put(tag, val);
                }
            }
            if (!map.isEmpty()) list.add(map);
        }
        return list;
    }

    private int intText(Document doc, String tag) {
        NodeList nodes = doc.getElementsByTagName(tag);
        if (nodes.getLength() == 0) return 0;
        try { return Integer.parseInt(nodes.item(0).getTextContent().trim()); }
        catch (Exception e) { return 0; }
    }
}
