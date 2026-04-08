package com.assembly.adapter.out.batch;

import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.bill.port.out.BillProposerPort;
import com.assembly.domain.bill.Bill;
import com.assembly.domain.bill.BillProposer;
import com.assembly.domain.bill.BillStatus;
import com.assembly.domain.bill.ProposerRole;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class BillCollectorJob {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final BillPort billPort;
    private final BillProposerPort billProposerPort;
    private final RestClient assemblyRestClient;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Value("${assembly.bill.age:22}")
    private String assemblyAge;

    @Bean
    public Job collectBillsJob() {
        return new JobBuilder("collectBillsJob", jobRepository)
                .start(collectBillsStep())
                .build();
    }

    @Bean
    public Step collectBillsStep() {
        return new StepBuilder("collectBillsStep", jobRepository)
                .<Map<String, Object>, BillWithProposers>chunk(100, transactionManager)
                .reader(billItemReader())
                .processor(billItemProcessor())
                .writer(billItemWriter())
                .faultTolerant()
                .retry(Exception.class)
                .retryLimit(3)
                .build();
    }

    @Bean
    @StepScope
    public ItemReader<Map<String, Object>> billItemReader() {
        return new AssemblyApiReader<>(assemblyRestClient, "/nzmimeepazxkubdpn", Map.of("AGE", assemblyAge));
    }

    @Bean
    @StepScope
    public ItemProcessor<Map<String, Object>, BillWithProposers> billItemProcessor() {
        return item -> {
            String billNo = (String) item.get("BILL_NO");
            if (billNo == null || billNo.isBlank()) return null;

            String billName = (String) item.get("BILL_NAME");
            String committee = (String) item.get("COMMITTEE");
            String procResultRaw = (String) item.get("PROC_RESULT");
            BillStatus status = mapProcResultToStatus(procResultRaw);

            String procDtStr = (String) item.get("PROC_DT");
            LocalDate passDt = procDtStr != null && !procDtStr.isBlank()
                    ? LocalDate.parse(procDtStr, DATE_FMT) : null;

            String detailLink = (String) item.get("DETAIL_LINK");

            // Bill upsert
            Optional<Bill> existing = billPort.findByBillNo(billNo);
            Bill bill;
            if (existing.isPresent()) {
                existing.get().update(billName, committee, status, passDt, procResultRaw, detailLink);
                bill = existing.get();
            } else {
                String proposeDtStr = (String) item.get("PROPOSE_DT");
                LocalDate proposeDt = proposeDtStr != null && !proposeDtStr.isBlank()
                        ? LocalDate.parse(proposeDtStr, DATE_FMT) : null;

                String rstMonaCd = (String) item.get("RST_MONA_CD");
                String monaCd = rstMonaCd != null ? rstMonaCd.split(",")[0].trim() : null;

                String rstProposer = (String) item.get("RST_PROPOSER");
                String firstProposerName = rstProposer != null ? rstProposer.split(",")[0].trim() : null;

                bill = Bill.builder()
                        .billNo(billNo)
                        .billId((String) item.get("BILL_ID"))
                        .billName(billName)
                        .monaCd(monaCd)
                        .proposerName(firstProposerName)
                        .proposeDt(proposeDt)
                        .status(status)
                        .passDt(passDt)
                        .committee(committee)
                        .procResult(procResultRaw)
                        .age((String) item.get("AGE"))
                        .detailLink(detailLink)
                        .build();
            }

            // BillProposer 파싱
            List<BillProposer> proposers = new ArrayList<>();
            parseProposers(billNo, (String) item.get("RST_MONA_CD"), (String) item.get("RST_PROPOSER"),
                    ProposerRole.MAIN, proposers);
            parseProposers(billNo, (String) item.get("PUBL_MONA_CD"), (String) item.get("PUBL_PROPOSER"),
                    ProposerRole.CO, proposers);

            return new BillWithProposers(bill, proposers);
        };
    }

    @Bean
    @StepScope
    public ItemWriter<BillWithProposers> billItemWriter() {
        return items -> {
            List<Bill> bills = items.getItems().stream()
                    .map(BillWithProposers::bill)
                    .toList();
            billPort.saveAll(new ArrayList<>(bills));

            int proposerCount = 0;
            for (BillWithProposers bwp : items.getItems()) {
                for (BillProposer p : bwp.proposers()) {
                    billProposerPort.upsert(p.getBillNo(), p.getMonaCd(),
                            p.getRole().name(), p.getProposerName());
                    proposerCount++;
                }
            }
            log.info("법안 {}건, 발의자 관계 {}건 저장/갱신 완료", bills.size(), proposerCount);
        };
    }

    private void parseProposers(String billNo, String monaCdRaw, String nameRaw,
                                ProposerRole role, List<BillProposer> result) {
        if (monaCdRaw == null || monaCdRaw.isBlank()) return;
        String[] codes = monaCdRaw.split(",");
        String[] names = (nameRaw != null) ? nameRaw.split(",") : new String[0];
        for (int i = 0; i < codes.length; i++) {
            String cd = codes[i].trim();
            if (cd.isBlank()) continue;
            String name = (i < names.length) ? names[i].trim() : "";
            result.add(BillProposer.builder()
                    .billNo(billNo)
                    .monaCd(cd)
                    .role(role)
                    .proposerName(name)
                    .build());
        }
    }

    private BillStatus mapProcResultToStatus(String procResult) {
        if (procResult == null || procResult.isBlank()) return BillStatus.PROPOSED;
        return switch (procResult) {
            case "원안가결", "수정가결" -> BillStatus.PASSED;
            case "부결" -> BillStatus.REJECTED;
            case "철회" -> BillStatus.WITHDRAWN;
            case "대안반영폐기", "임기만료폐기", "폐기" -> BillStatus.EXPIRED;
            default -> BillStatus.COMMITTEE;
        };
    }
}
