package com.assembly.adapter.out.batch;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.CommitteeAttendance;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 열린국회정보 상임위/특위 출결현황 PDF 파서.
 *
 * TextPosition 좌표 기반으로 파싱하여 다음 형식 차이를 흡수:
 *  - 2024: 토큰 간 공백 있음, 페이지당 단일 회기
 *  - 2025: 공백 없는 연속 텍스트, 페이지당 복수 회기 혼재 가능
 *
 * 페이지당 1개 위원회. 각 페이지에서:
 *   1. TextPosition 수집 → Y±3pt 기준 행 그룹화 → X gap으로 토큰 분리
 *   2. 행 유형 분류: 위원회명 / 회기 / 날짜 / 차수 / 의원 데이터
 *   3. MeetingColumn 맵 구성 (복수 회기 X범위 매핑 포함)
 *   4. 의원 행 파싱 → CommitteeAttendance 생성
 */
@Slf4j
public class CommitteeAttendancePdfParser {

    private static final Pattern SESSION_PATTERN   = Pattern.compile("제(\\d{3,})회");
    private static final Pattern MEETING_PATTERN   = Pattern.compile("제(\\d{1,2})차");
    private static final Pattern DATE_PATTERN      = Pattern.compile("(\\d{1,2})월(\\d{1,2})일");
    private static final Pattern MONTH_ONLY        = Pattern.compile("^(\\d{1,2})월$");
    private static final Pattern DAY_ONLY          = Pattern.compile("^(\\d{1,2})일$");
    private static final Pattern MEMBER_PATTERN    = Pattern.compile("^([가-힣]{2,5})[（(]");
    private static final Pattern COMMITTEE_PATTERN = Pattern.compile("위원회$");
    private static final Set<String> STATUS_VALUES =
            Set.of("출석", "결석", "청가", "출장", "결석신고서");

    private CommitteeAttendancePdfParser() {}

    /**
     * PDF 바이트를 파싱하여 CommitteeAttendance 레코드 리스트 반환.
     *
     * @param pdfBytes PDF 파일 바이트
     * @param fileSeq  파일 식별자 (열린국회정보 fileSeq)
     * @param year     파일명에서 추출한 연도 (날짜 MM월DD일 보완용)
     */
    public static List<CommitteeAttendance> parse(byte[] pdfBytes, long fileSeq, int year)
            throws IOException {
        List<CommitteeAttendance> results = new ArrayList<>();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            int totalPages = doc.getNumberOfPages();
            for (int page = 0; page < totalPages; page++) {
                try {
                    results.addAll(parsePage(doc, page, fileSeq, year));
                } catch (Exception e) {
                    log.warn("페이지 파싱 실패: fileSeq={}, page={}, 오류={}",
                            fileSeq, page + 1, e.getMessage());
                }
            }
        }

        log.info("PDF 파싱 완료: fileSeq={}, {}건", fileSeq, results.size());
        return results;
    }

    // ── 페이지 단위 파싱 ──────────────────────────────────────────────

    private static List<CommitteeAttendance> parsePage(PDDocument doc, int pageIndex,
                                                       long fileSeq, int year) throws IOException {
        PositionAwareStripper stripper = new PositionAwareStripper(pageIndex + 1);
        stripper.getText(doc);

        List<TextChunk> chunks = stripper.getChunks();
        if (chunks.isEmpty()) return List.of();

        List<Row> rows = groupIntoRows(chunks);

        // ── 행 유형별 수집 ────────────────────────────────────────────
        String committeeName = null;
        List<float[]> sessionPoints = new ArrayList<>();  // [x, sessionNo]
        Map<Float, LocalDate> dateMap = new TreeMap<>();   // colX → date
        Map<Float, Integer>   meetMap = new TreeMap<>();   // colX → meetingNo
        List<Row> memberRows = new ArrayList<>();

        for (Row row : rows) {
            List<TextChunk> tokens = row.tokens();
            if (tokens.isEmpty()) continue;

            String firstText = tokens.get(0).text();

            // 1) 위원회명 탐색 (아직 미발견인 경우)
            if (committeeName == null) {
                for (TextChunk t : tokens) {
                    if (COMMITTEE_PATTERN.matcher(t.text()).find()) {
                        committeeName = t.text().trim();
                        break;
                    }
                }
                if (committeeName != null) continue;
            }

            // 2) 회기 행: 제NNN회 패턴
            boolean hasSession = tokens.stream()
                    .anyMatch(t -> SESSION_PATTERN.matcher(t.text()).find());
            if (hasSession) {
                for (TextChunk t : tokens) {
                    Matcher m = SESSION_PATTERN.matcher(t.text());
                    while (m.find()) {
                        sessionPoints.add(new float[]{t.x(), Float.parseFloat(m.group(1))});
                    }
                }
                continue;
            }

            // 3) 날짜 행: MM월DD일 (단일 토큰) 또는 "MM월" + "DD일" (공백으로 분리된 토큰)
            boolean hasDate = tokens.stream()
                    .anyMatch(t -> DATE_PATTERN.matcher(t.text()).matches()
                            || MONTH_ONLY.matcher(t.text()).matches());
            if (hasDate) {
                extractDatesFromRow(tokens, year, dateMap);
                continue;
            }

            // 4) 차수 행: 제N차 패턴
            boolean hasMeeting = tokens.stream()
                    .anyMatch(t -> MEETING_PATTERN.matcher(t.text()).matches());
            if (hasMeeting) {
                for (TextChunk t : tokens) {
                    Matcher m = MEETING_PATTERN.matcher(t.text());
                    if (m.matches()) {
                        meetMap.put(t.x(), Integer.parseInt(m.group(1)));
                    }
                }
                continue;
            }

            // 5) 의원 데이터 행
            if (MEMBER_PATTERN.matcher(firstText).find()) {
                memberRows.add(row);
            }
        }

        // ── 필수값 검증 ───────────────────────────────────────────────
        if (committeeName == null || dateMap.isEmpty() || meetMap.isEmpty()) {
            log.debug("파싱 불가 페이지: fileSeq={}, page={}, committee={}, dates={}, meetings={}",
                    fileSeq, pageIndex + 1, committeeName, dateMap.size(), meetMap.size());
            return List.of();
        }

        // ── 미팅 컬럼 맵 구성 ─────────────────────────────────────────
        Map<Float, MeetingInfo> meetingInfoMap =
                buildMeetingInfoMap(sessionPoints, dateMap, meetMap);
        if (meetingInfoMap.isEmpty()) {
            log.warn("미팅 컬럼 매핑 실패: fileSeq={}, page={}, committee={}",
                    fileSeq, pageIndex + 1, committeeName);
            return List.of();
        }

        float tolerance = computeTolerance(meetingInfoMap.keySet());

        // ── 의원 행 파싱 ──────────────────────────────────────────────
        List<CommitteeAttendance> results = new ArrayList<>();
        final String cn = committeeName;

        for (Row memberRow : memberRows) {
            List<TextChunk> tokens = memberRow.tokens();
            String name = extractMemberName(tokens.get(0).text());
            if (name == null) continue;

            for (Map.Entry<Float, MeetingInfo> entry : meetingInfoMap.entrySet()) {
                float colX = entry.getKey();
                MeetingInfo info = entry.getValue();

                tokens.stream()
                        .filter(t -> Math.abs(t.x() - colX) <= tolerance
                                && STATUS_VALUES.contains(t.text()))
                        .findFirst()
                        .map(t -> parseStatus(t.text()))
                        .filter(Objects::nonNull)
                        .ifPresent(status -> results.add(CommitteeAttendance.builder()
                                .memberName(name)
                                .committeeName(cn)
                                .sessionNo(info.sessionNo())
                                .meetingNo(info.meetingNo())
                                .meetingDt(info.date())
                                .status(status)
                                .fileSeq(fileSeq)
                                .build()));
            }
        }

        log.debug("페이지 완료: {} {}건", committeeName, results.size());
        return results;
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────

    /** TextChunk 리스트를 Y 좌표(±3pt) 기준으로 행 그룹화. */
    private static List<Row> groupIntoRows(List<TextChunk> chunks) {
        List<TextChunk> sorted = chunks.stream()
                .sorted(Comparator.comparingDouble(TextChunk::y))
                .toList();

        List<Row> rows = new ArrayList<>();
        List<TextChunk> current = new ArrayList<>();
        float prevY = Float.MIN_VALUE;

        for (TextChunk c : sorted) {
            if (!current.isEmpty() && Math.abs(c.y() - prevY) > 3f) {
                rows.add(new Row(sortedByX(current)));
                current = new ArrayList<>();
            }
            current.add(c);
            prevY = c.y();
        }
        if (!current.isEmpty()) rows.add(new Row(sortedByX(current)));

        return rows;
    }

    private static List<TextChunk> sortedByX(List<TextChunk> chunks) {
        return chunks.stream().sorted(Comparator.comparingDouble(TextChunk::x)).toList();
    }

    /**
     * 회기 정보, 날짜, 차수를 결합하여 MeetingInfo 맵 구성.
     * 복수 회기(제424회 + 제425회)의 경우 X 위치 기반으로 회기 할당.
     */
    private static Map<Float, MeetingInfo> buildMeetingInfoMap(
            List<float[]> sessionPoints,
            Map<Float, LocalDate> dateMap,
            Map<Float, Integer> meetMap) {

        final float dateToMeetTolerance = 25f;
        Map<Float, MeetingInfo> result = new LinkedHashMap<>();

        for (Map.Entry<Float, LocalDate> dateEntry : dateMap.entrySet()) {
            float dateX = dateEntry.getKey();
            LocalDate date = dateEntry.getValue();

            // 가장 가까운 차수 찾기
            int meetingNo = meetMap.entrySet().stream()
                    .min(Comparator.comparingDouble(e -> Math.abs(e.getKey() - dateX)))
                    .filter(e -> Math.abs(e.getKey() - dateX) <= dateToMeetTolerance)
                    .map(Map.Entry::getValue)
                    .orElse(0);

            if (meetingNo == 0) {
                log.debug("차수 매핑 실패: dateX={}, date={}", dateX, date);
                continue;
            }

            int sessionNo = resolveSessionNo(dateX, sessionPoints);
            result.put(dateX, new MeetingInfo(sessionNo, meetingNo, date));
        }

        return result;
    }

    /**
     * X 위치를 기준으로 어느 회기에 속하는지 결정.
     * 단일 회기면 그 값을, 복수 회기면 X가 가장 가까운 회기 선택.
     */
    private static int resolveSessionNo(float x, List<float[]> sessionPoints) {
        if (sessionPoints.isEmpty()) return 0;
        return sessionPoints.stream()
                .min(Comparator.comparingDouble(p -> Math.abs(p[0] - x)))
                .map(p -> (int) p[1])
                .orElse(0);
    }

    /** 미팅 컬럼 최소 간격의 절반을 허용 오차로 사용 (최소 15pt, 최대 30pt). */
    private static float computeTolerance(Set<Float> colXSet) {
        if (colXSet.size() < 2) return 20f;
        List<Float> sorted = colXSet.stream().sorted().toList();
        float minGap = Float.MAX_VALUE;
        for (int i = 1; i < sorted.size(); i++) {
            minGap = Math.min(minGap, sorted.get(i) - sorted.get(i - 1));
        }
        return Math.max(15f, Math.min(30f, minGap / 2));
    }

    /**
     * 행 토큰에서 날짜를 추출하여 dateMap에 추가.
     * - 단일 토큰: "06월18일" → DATE_PATTERN 매칭
     * - 분리 토큰: "06월" + "18일" → MONTH_ONLY + DAY_ONLY 매칭 후 합산
     *   X 위치는 두 토큰의 중간값 사용 (차수 컬럼 매칭 정확도 향상)
     */
    private static void extractDatesFromRow(List<TextChunk> tokens, int year,
                                            Map<Float, LocalDate> dateMap) {
        for (int i = 0; i < tokens.size(); i++) {
            String text = tokens.get(i).text();

            // 단일 토큰: MM월DD일
            Matcher full = DATE_PATTERN.matcher(text);
            if (full.matches()) {
                int mon = Integer.parseInt(full.group(1));
                int day = Integer.parseInt(full.group(2));
                dateMap.put(tokens.get(i).x(), LocalDate.of(year, mon, day));
                continue;
            }

            // 분리 토큰: "MM월" 다음에 "DD일"
            Matcher mMonth = MONTH_ONLY.matcher(text);
            if (mMonth.matches() && i + 1 < tokens.size()) {
                Matcher mDay = DAY_ONLY.matcher(tokens.get(i + 1).text());
                if (mDay.matches()) {
                    int mon = Integer.parseInt(mMonth.group(1));
                    int day = Integer.parseInt(mDay.group(1));
                    float x = (tokens.get(i).x() + tokens.get(i + 1).x()) / 2f;
                    dateMap.put(x, LocalDate.of(year, mon, day));
                    i++; // 다음 토큰(DD일)은 이미 소비
                }
            }
        }
    }

    private static String extractMemberName(String text) {
        Matcher m = MEMBER_PATTERN.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static AttendanceStatus parseStatus(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "출석"               -> AttendanceStatus.PRESENT;
            case "결석", "결석신고서" -> AttendanceStatus.ABSENT;
            case "청가"               -> AttendanceStatus.LEAVE;
            case "출장"               -> AttendanceStatus.OFFICIAL_TRIP;
            default                   -> null;
        };
    }

    // ── 내부 레코드 ───────────────────────────────────────────────────

    record TextChunk(float x, float y, String text) {}
    record Row(List<TextChunk> tokens) {}
    record MeetingInfo(int sessionNo, int meetingNo, LocalDate date) {}

    // ── PDFBox TextPosition 수집기 ────────────────────────────────────

    private static class PositionAwareStripper extends PDFTextStripper {

        private final List<TextChunk> chunks = new ArrayList<>();

        PositionAwareStripper(int page) throws IOException {
            setStartPage(page);
            setEndPage(page);
            setSortByPosition(true);
        }

        List<TextChunk> getChunks() {
            return Collections.unmodifiableList(chunks);
        }

        /**
         * 각 텍스트 런(text run)에서 TextPosition의 X좌표를 분석하여
         * X-gap > fontSize*0.35 인 위치를 새 토큰의 시작으로 판단.
         * 공백 없이 붙어있는 2025년 형식과 공백 있는 2024년 형식 모두 처리.
         */
        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            if (textPositions == null || textPositions.isEmpty()) return;

            StringBuilder currentToken = new StringBuilder();
            float tokenX = 0, tokenY = 0;
            float prevEndX = -1;

            for (TextPosition tp : textPositions) {
                String unicode = tp.getUnicode();
                if (unicode == null || unicode.isBlank()) {
                    // 공백 문자 → 강제로 토큰 분리
                    flushToken(currentToken, tokenX, tokenY);
                    currentToken = new StringBuilder();
                    prevEndX = -1;
                    continue;
                }

                float charX = tp.getXDirAdj();
                float charY = tp.getYDirAdj();
                float charW = tp.getWidthDirAdj();

                if (prevEndX < 0) {
                    // 새 텍스트 런의 첫 문자
                    tokenX = charX;
                    tokenY = charY;
                    currentToken.append(unicode);
                    prevEndX = charX + charW;
                    continue;
                }

                float gap = charX - prevEndX;
                float threshold = Math.max(tp.getFontSizeInPt() * 0.35f, 2f);

                if (gap > threshold) {
                    // 충분한 간격 → 새 토큰
                    flushToken(currentToken, tokenX, tokenY);
                    currentToken = new StringBuilder();
                    tokenX = charX;
                    tokenY = charY;
                }

                currentToken.append(unicode);
                prevEndX = charX + charW;
            }

            flushToken(currentToken, tokenX, tokenY);
        }

        private void flushToken(StringBuilder sb, float x, float y) {
            String token = sb.toString().trim();
            if (!token.isEmpty()) {
                chunks.add(new TextChunk(x, y, token));
            }
        }
    }
}
