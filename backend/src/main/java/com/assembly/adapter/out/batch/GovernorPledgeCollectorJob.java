package com.assembly.adapter.out.batch;

import com.assembly.application.governor.port.out.GovernorPledgePort;
import com.assembly.application.governor.port.out.LocalGovernorPort;
import com.assembly.domain.governor.GovernorPledge;
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
import java.util.List;

/**
 * 선관위 선거공약 API로 지자체장(시도지사·기초단체장) 공약 수집.
 * local_governors 테이블의 huboid를 순회하며 cnddtId로 API 호출.
 * 실행: POST /api/v1/admin/batch/governor-pledges?sgId=20220601
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class GovernorPledgeCollectorJob {

    private static final String ENDPOINT =
            "http://apis.data.go.kr/9760000/ElecPrmsInfoInqireService/getCnddtElecPrmsInfoInqire";

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final LocalGovernorPort localGovernorPort;
    private final GovernorPledgePort governorPledgePort;

    @Value("${election.api.key}")
    private String electionApiKey;

    @Bean
    public Job collectGovernorPledgesJob() {
        return new JobBuilder("collectGovernorPledgesJob", jobRepository)
                .start(collectGovernorPledgesStep())
                .build();
    }

    @Bean
    public Step collectGovernorPledgesStep() {
        return new StepBuilder("collectGovernorPledgesStep", jobRepository)
                .tasklet(governorPledgesTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet governorPledgesTasklet() {
        return (contribution, chunkContext) -> {
            String sgId = (String) chunkContext.getStepContext()
                    .getJobParameters().get("sgId");
            if (sgId == null || sgId.isBlank()) {
                sgId = "20220601";
            }

            List<LocalGovernor> governors = localGovernorPort.findBySgId(sgId);
            log.info("공약 수집 대상: sgId={}, {}명", sgId, governors.size());

            RestClient client = RestClient.create();
            int saved = 0, skipped = 0;

            for (LocalGovernor governor : governors) {
                String sgTypecode = governor.getGovernorType() == GovernorType.METRO_MAYOR ? "3" : "4";
                List<GovernorPledge> pledges = fetchPledges(client, sgId, sgTypecode, governor.getHuboid());

                if (pledges.isEmpty()) {
                    skipped++;
                    continue;
                }

                governorPledgePort.deleteByHuboid(governor.getHuboid());
                governorPledgePort.saveAll(pledges);
                saved += pledges.size();
                log.debug("저장: {} ({}) 공약 {}건", governor.getName(), governor.getHuboid(), pledges.size());
            }

            log.info("지자체장 공약 수집 완료: 저장={}건, 공약없음={}명", saved, skipped);
            return RepeatStatus.FINISHED;
        };
    }

    private List<GovernorPledge> fetchPledges(RestClient client, String sgId,
                                               String sgTypecode, String cnddtId) {
        String url = UriComponentsBuilder.fromHttpUrl(ENDPOINT)
                .queryParam("ServiceKey", electionApiKey)
                .queryParam("sgId", sgId)
                .queryParam("sgTypecode", sgTypecode)
                .queryParam("cnddtId", cnddtId)
                .queryParam("numOfRows", 1)
                .queryParam("pageNo", 1)
                .build(true)
                .toUriString();

        byte[] xmlBytes;
        try {
            xmlBytes = client.get().uri(url).retrieve().body(byte[].class);
        } catch (Exception e) {
            log.warn("선관위 공약 API 호출 실패: cnddtId={}, 오류={}", cnddtId, e.getMessage());
            return List.of();
        }

        if (xmlBytes == null || xmlBytes.length == 0) return List.of();

        try {
            Document doc = DocumentBuilderFactory.newInstance()
                    .newDocumentBuilder()
                    .parse(new ByteArrayInputStream(xmlBytes));
            doc.getDocumentElement().normalize();

            NodeList items = doc.getElementsByTagName("item");
            if (items.getLength() == 0) return List.of();

            Element item = (Element) items.item(0);
            int prmsCnt = intText(item, "prmsCnt");
            if (prmsCnt == 0) return List.of();

            List<GovernorPledge> pledges = new ArrayList<>();
            for (int i = 1; i <= prmsCnt && i <= 10; i++) {
                String title = text(item, "prmsTitle" + i);
                if (title == null || title.isBlank()) continue;

                pledges.add(GovernorPledge.builder()
                        .huboid(cnddtId)
                        .pledgeOrder(i)
                        .realmName(text(item, "prmsRealmName" + i))
                        .title(title)
                        .content(text(item, "prmsCont" + i))
                        .build());
            }
            return pledges;
        } catch (Exception e) {
            log.warn("공약 XML 파싱 실패: cnddtId={}, 오류={}", cnddtId, e.getMessage());
            return List.of();
        }
    }

    private String text(Element el, String tag) {
        NodeList nodes = el.getElementsByTagName(tag);
        if (nodes.getLength() == 0) return null;
        String val = nodes.item(0).getTextContent().trim();
        return val.isEmpty() ? null : val;
    }

    private int intText(Element el, String tag) {
        String val = text(el, tag);
        if (val == null) return 0;
        try { return Integer.parseInt(val); } catch (Exception e) { return 0; }
    }
}
