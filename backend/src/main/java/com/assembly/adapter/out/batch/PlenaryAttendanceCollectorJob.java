package com.assembly.adapter.out.batch;

import com.assembly.application.attendance.port.out.PlenaryAttendancePort;
import com.assembly.application.attendance.port.out.ProcessedPlenaryFilePort;
import com.assembly.application.member.port.out.MemberPort;
import com.assembly.domain.attendance.PlenaryAttendance;
import com.assembly.domain.attendance.ProcessedPlenaryFile;
import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 열린국회정보 본회의 출결현황 Excel 파일을 수집하는 배치 Job.
 *
 * 처리 흐름:
 *   1. 파일 목록 API로 전체 xlsx 파일 조회
 *   2. 미처리 파일만 필터링 (ProcessedPlenaryFile 테이블 기준)
 *   3. 파일 다운로드 → Apache POI 파싱 → DB 저장
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class PlenaryAttendanceCollectorJob {

    private static final String PORTAL_BASE = "https://open.assembly.go.kr/portal/data";
    private static final String INF_ID      = "O4Q5B50011905O18367";
    private static final String INF_SEQ     = "1";

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final MemberPort memberPort;
    private final PlenaryAttendancePort plenaryAttendancePort;
    private final ProcessedPlenaryFilePort processedPlenaryFilePort;

    @Bean
    public Job collectPlenaryAttendanceJob() {
        return new JobBuilder("collectPlenaryAttendanceJob", jobRepository)
                .start(collectPlenaryAttendanceStep())
                .build();
    }

    @Bean
    public Step collectPlenaryAttendanceStep() {
        return new StepBuilder("collectPlenaryAttendanceStep", jobRepository)
                .tasklet(plenaryAttendanceTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet plenaryAttendanceTasklet() {
        return (contribution, chunkContext) -> {
            RestClient client = buildPortalClient();

            // 1. 전체 파일 목록 조회
            List<FileItem> files = fetchFileList(client);
            List<FileItem> xlsxFiles = files.stream()
                    .filter(f -> "xlsx".equalsIgnoreCase(f.fileExt()))
                    .toList();
            log.info("전체 파일 {}건, xlsx {}건", files.size(), xlsxFiles.size());

            // 2. 미처리 파일 필터링
            Set<Long> processed = processedPlenaryFilePort.findAllFileSeqs();
            List<FileItem> targets = xlsxFiles.stream()
                    .filter(f -> !processed.contains(f.fileSeq()))
                    .toList();
            log.info("미처리 파일 {}건 수집 시작", targets.size());

            int totalSaved = 0;
            for (FileItem file : targets) {
                try {
                    int saved = processFile(client, file);
                    totalSaved += saved;
                } catch (Exception e) {
                    log.error("파일 처리 실패: fileSeq={}, name={}, 오류={}", file.fileSeq(), file.viewFileNm(), e.getMessage(), e);
                }
            }

            log.info("본회의 출결현황 수집 완료: {}건 저장", totalSaved);
            return RepeatStatus.FINISHED;
        };
    }

    private int processFile(RestClient client, FileItem file) throws Exception {
        log.info("처리 중: fileSeq={}, name={}", file.fileSeq(), file.viewFileNm());

        // 파일 다운로드
        byte[] bytes = client.get()
                .uri("/file/downloadFileData.do?infId={infId}&infSeq={infSeq}&fileSeq={fileSeq}",
                        INF_ID, INF_SEQ, file.fileSeq())
                .retrieve()
                .body(byte[].class);

        if (bytes == null || bytes.length == 0) {
            log.warn("빈 파일: fileSeq={}", file.fileSeq());
            return 0;
        }

        // Excel 파싱
        List<PlenaryAttendance> records;
        try (var wb = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            records = PlenaryAttendanceExcelParser.parse(wb, file.fileSeq());
        }

        if (records.isEmpty()) {
            log.warn("파싱 결과 없음: fileSeq={}", file.fileSeq());
            return 0;
        }

        // 의원 이름+정당 → monaCd 매핑
        // records는 동일 이름이 여러 차수에 걸쳐 반복되므로, 이름별로 한 번만 조회
        Map<String, String> nameToMonaCd = buildNameMonaCdMap(records, file.viewFileNm());
        for (PlenaryAttendance record : records) {
            String monaCd = nameToMonaCd.get(record.getMemberName());
            if (monaCd != null) record.assignMonaCd(monaCd);
        }

        // DB 저장
        plenaryAttendancePort.saveAll(records);

        // 처리 이력 저장
        processedPlenaryFilePort.save(ProcessedPlenaryFile.builder()
                .fileSeq(file.fileSeq())
                .sessionNo(extractSessionNo(file.viewFileNm()))
                .fileName(file.viewFileNm())
                .rowCount(records.size())
                .build());

        log.info("저장 완료: fileSeq={}, {}건", file.fileSeq(), records.size());
        return records.size();
    }

    // ── API 조회 ─────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<FileItem> fetchFileList(RestClient client) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("infId",  INF_ID);
        form.add("infSeq", INF_SEQ);

        Map<String, Object> response = client.post()
                .uri("/file/searchFileData.do")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (response == null || !response.containsKey("data")) return List.of();

        List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
        return dataList.stream().map(m -> new FileItem(
                ((Number) m.get("fileSeq")).longValue(),
                (String) m.get("viewFileNm"),
                (String) m.get("fileExt")
        )).toList();
    }

    // ── 유틸 ─────────────────────────────────────────────────────────────────

    private static RestClient buildPortalClient() {
        // 열린국회정보 포털은 JSON 응답에 text/html Content-Type을 반환하므로 커스텀 converter 필요
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                new MediaType("text", "html", StandardCharsets.UTF_8),
                new MediaType("text", "plain", StandardCharsets.UTF_8)
        ));

        return RestClient.builder()
                .baseUrl(PORTAL_BASE)
                .messageConverters(converters -> {
                    converters.removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
                    converters.add(0, converter);
                })
                .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; VoteTheBoat/1.0)")
                .defaultHeader("Referer",
                        "https://open.assembly.go.kr/portal/data/service/selectServicePage.do/" + INF_ID)
                .build();
    }

    /**
     * records에서 의원명 중복을 제거하고, 이름+정당으로 monaCd를 조회하여 맵 반환.
     * 정당 매핑 실패 시 이름만으로 재시도.
     * Excel에는 정당 정보가 각 행에 있으므로 첫 번째 record에서 정당을 가져옴.
     * (같은 이름의 의원이 같은 파일에 두 개 정당으로 등장하는 경우는 없다고 가정)
     */
    private Map<String, String> buildNameMonaCdMap(List<PlenaryAttendance> records, String fileName) {
        Map<String, String> result = new HashMap<>();

        records.stream()
                .map(PlenaryAttendance::getMemberName)
                .distinct()
                .forEach(name -> {
                    List<Member> candidates = memberPort.findByName(name);
                    if (candidates.size() == 1) {
                        result.put(name, candidates.get(0).getMonaCd());
                    } else if (candidates.size() > 1) {
                        // 동명이인: ACTIVE 상태 우선
                        candidates.stream()
                                .filter(m -> MemberStatus.ACTIVE == m.getStatus())
                                .findFirst()
                                .ifPresentOrElse(
                                        m -> result.put(name, m.getMonaCd()),
                                        () -> log.warn("동명이인 매핑 불가: 이름={}, 파일={}", name, fileName)
                                );
                    } else {
                        log.debug("의원 미발견: 이름={}", name);
                    }
                });

        long total = records.stream().map(PlenaryAttendance::getMemberName).distinct().count();
        log.info("monaCd 매핑: {}건 / {}건 (파일={})", result.size(), total, fileName);
        return result;
    }

    /** "제433회국회(임시회) 본회의 출결현황" → 433 */
    private static int extractSessionNo(String fileName) {
        if (fileName == null) return 0;
        var m = java.util.regex.Pattern.compile("(\\d{3,})회").matcher(fileName);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    record FileItem(long fileSeq, String viewFileNm, String fileExt) {}
}
