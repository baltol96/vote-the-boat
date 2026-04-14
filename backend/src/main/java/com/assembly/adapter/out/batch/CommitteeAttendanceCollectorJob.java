package com.assembly.adapter.out.batch;

import com.assembly.application.attendance.port.out.CommitteeAttendancePort;
import com.assembly.application.attendance.port.out.ProcessedCommitteeFilePort;
import com.assembly.application.member.port.out.MemberPort;
import com.assembly.domain.attendance.CommitteeAttendance;
import com.assembly.domain.attendance.ProcessedCommitteeFile;
import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberStatus;
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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 열린국회정보 상임위/특위 출결현황 PDF 파일을 수집하는 배치 Job.
 *
 * 처리 흐름:
 *   1. 파일 목록 API로 전체 PDF 파일 조회
 *   2. 미처리 파일만 필터링 (ProcessedCommitteeFile 테이블 기준)
 *   3. 파일 다운로드 → CommitteeAttendancePdfParser → DB 저장
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class CommitteeAttendanceCollectorJob {

    private static final String PORTAL_BASE = "https://open.assembly.go.kr/portal/data";
    private static final String INF_ID      = "OND4F9001191DA18437";
    private static final String INF_SEQ     = "1";

    private static final Pattern YEAR_PATTERN  = Pattern.compile("(\\d{4})년");
    private static final Pattern MONTH_PATTERN = Pattern.compile("(\\d{1,2})월");

    /** 22대 국회 시작: 2024년 6월 */
    private static final int FILTER_YEAR  = 2024;
    private static final int FILTER_MONTH = 6;

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final MemberPort memberPort;
    private final CommitteeAttendancePort committeeAttendancePort;
    private final ProcessedCommitteeFilePort processedCommitteeFilePort;

    @Bean
    public Job collectCommitteeAttendanceJob() {
        return new JobBuilder("collectCommitteeAttendanceJob", jobRepository)
                .start(collectCommitteeAttendanceStep())
                .build();
    }

    @Bean
    public Step collectCommitteeAttendanceStep() {
        return new StepBuilder("collectCommitteeAttendanceStep", jobRepository)
                .tasklet(committeeAttendanceTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet committeeAttendanceTasklet() {
        return (contribution, chunkContext) -> {
            RestClient client         = buildPortalClient();   // JSON API용
            RestClient downloadClient = buildDownloadClient(); // 바이너리 다운로드용

            // 1. 전체 파일 목록 조회
            List<FileItem> files = fetchFileList(client);
            List<FileItem> pdfFiles = files.stream()
                    .filter(f -> "pdf".equalsIgnoreCase(f.fileExt()))
                    .toList();
            log.info("전체 파일 {}건, PDF {}건", files.size(), pdfFiles.size());

            // 2. 22대 국회 시작(2024년 6월) 이후 파일만 대상으로 설정
            List<FileItem> filteredPdfs = pdfFiles.stream()
                    .filter(f -> isFrom22ndAssembly(f.viewFileNm()))
                    .toList();
            log.info("2024년 6월 이후 PDF {}건", filteredPdfs.size());

            // 3. 미처리 파일 필터링
            Set<Long> processed = processedCommitteeFilePort.findAllFileSeqs();
            List<FileItem> targets = filteredPdfs.stream()
                    .filter(f -> !processed.contains(f.fileSeq()))
                    .toList();
            log.info("미처리 PDF {}건 수집 시작", targets.size());

            int totalSaved = 0;
            for (FileItem file : targets) {
                try {
                    int saved = processFile(downloadClient, file);
                    totalSaved += saved;
                } catch (Exception e) {
                    log.error("파일 처리 실패: fileSeq={}, name={}, 오류={}",
                            file.fileSeq(), file.viewFileNm(), e.getMessage(), e);
                }
            }

            log.info("상임위/특위 출결현황 수집 완료: {}건 저장", totalSaved);
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

        // 연도 추출 (파일명 기준, 예: "2024년도 6월 상임위 출결현황.pdf")
        int year = extractYear(file.viewFileNm());
        if (year == 0) {
            log.warn("연도 추출 실패, 파일 스킵: fileSeq={}, name={}", file.fileSeq(), file.viewFileNm());
            return 0;
        }

        // PDF 파싱
        List<CommitteeAttendance> records =
                CommitteeAttendancePdfParser.parse(bytes, file.fileSeq(), year);

        if (records.isEmpty()) {
            log.warn("파싱 결과 없음: fileSeq={}", file.fileSeq());
            return 0;
        }

        // 의원 이름 → monaCd 매핑
        Map<String, String> nameToMonaCd = buildNameMonaCdMap(records, file.viewFileNm());
        for (CommitteeAttendance record : records) {
            String monaCd = nameToMonaCd.get(record.getMemberName());
            if (monaCd != null) record.assignMonaCd(monaCd);
        }

        // DB 저장
        committeeAttendancePort.saveAll(records);

        // 처리 이력 저장 (멱등성)
        String committeeName = records.get(0).getCommitteeName();
        processedCommitteeFilePort.save(ProcessedCommitteeFile.builder()
                .fileSeq(file.fileSeq())
                .committeeName(committeeName)
                .fileName(file.viewFileNm())
                .rowCount(records.size())
                .build());

        log.info("저장 완료: fileSeq={}, {}건", file.fileSeq(), records.size());
        return records.size();
    }

    // ── API 조회 ─────────────────────────────────────────────────────

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

    // ── 유틸 ─────────────────────────────────────────────────────────

    /**
     * 의원명 중복 제거 후 이름 → monaCd 맵 구성.
     * ACTIVE 상태 의원 우선; 동명이인 모두 ACTIVE면 첫 번째 선택.
     */
    private Map<String, String> buildNameMonaCdMap(List<CommitteeAttendance> records,
                                                   String fileName) {
        Map<String, String> result = new HashMap<>();

        records.stream()
                .map(CommitteeAttendance::getMemberName)
                .distinct()
                .forEach(name -> {
                    List<Member> candidates = memberPort.findByName(name);
                    if (candidates.size() == 1) {
                        result.put(name, candidates.get(0).getMonaCd());
                    } else if (candidates.size() > 1) {
                        candidates.stream()
                                .filter(m -> MemberStatus.ACTIVE == m.getStatus())
                                .findFirst()
                                .ifPresentOrElse(
                                        m -> result.put(name, m.getMonaCd()),
                                        () -> log.warn("동명이인 매핑 불가: 이름={}, 파일={}",
                                                name, fileName)
                                );
                    } else {
                        log.debug("의원 미발견: 이름={}", name);
                    }
                });

        long total = records.stream().map(CommitteeAttendance::getMemberName).distinct().count();
        log.info("monaCd 매핑: {}건 / {}건 (파일={})", result.size(), total, fileName);
        return result;
    }

    /** "2024년도 6월 상임위 출결현황.pdf" → 2024 */
    private static int extractYear(String fileName) {
        if (fileName == null) return 0;
        Matcher m = YEAR_PATTERN.matcher(fileName);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    /** "2024년도 6월 상임위 출결현황.pdf" → 6 */
    private static int extractMonth(String fileName) {
        if (fileName == null) return 0;
        Matcher m = MONTH_PATTERN.matcher(fileName);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    /**
     * 22대 국회 시작(2024년 6월) 이후 파일인지 확인.
     * 연도·월을 파일명에서 추출할 수 없으면 false 반환(안전하게 제외).
     */
    private static boolean isFrom22ndAssembly(String fileName) {
        int year  = extractYear(fileName);
        int month = extractMonth(fileName);
        if (year == 0 || month == 0) return false;
        return year > FILTER_YEAR || (year == FILTER_YEAR && month >= FILTER_MONTH);
    }

    /** PDF 바이너리 다운로드 전용 클라이언트 — Jackson 컨버터 없이 기본 ByteArrayHttpMessageConverter 사용 */
    private static RestClient buildDownloadClient() {
        return RestClient.builder()
                .baseUrl(PORTAL_BASE)
                .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; VoteTheBoat/1.0)")
                .defaultHeader("Referer",
                        "https://open.assembly.go.kr/portal/data/service/selectServicePage.do/" + INF_ID)
                .build();
    }

    private static RestClient buildPortalClient() {
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                MediaType.APPLICATION_OCTET_STREAM,
                new MediaType("application", "pdf"),
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

    record FileItem(long fileSeq, String viewFileNm, String fileExt) {}
}
