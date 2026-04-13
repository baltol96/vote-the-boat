package com.assembly.adapter.out.batch;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.PlenaryAttendance;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 열린국회정보 본회의 출결현황 xlsx 파일 파서.
 *
 * 파일 구조 (행 인덱스 기준):
 *   행0: 빈 행
 *   행1: 구분 | 구분 | N회(임시) × 차수 수 | 총계 열들
 *   행2: 의원명 | 소속정당 | 1차(본회의) ... N차(본회의) | 집계 열들
 *   행3: 의원명 | 소속정당 | (YYYY년MM월DD일) ... | 집계 열들
 *   행4~: 의원 데이터
 */
@Slf4j
public class PlenaryAttendanceExcelParser {

    private static final Pattern SESSION_PATTERN = Pattern.compile("(\\d{3,})회");
    private static final Pattern MEETING_PATTERN  = Pattern.compile("(\\d+)차");
    private static final Pattern DATE_PATTERN     =
            Pattern.compile("\\((\\d{4})년(\\d{1,2})월(\\d{1,2})일\\)");

    private PlenaryAttendanceExcelParser() {}

    public static List<PlenaryAttendance> parse(Workbook workbook, long fileSeq) {
        Sheet sheet = workbook.getSheetAt(0);

        int sessionNo = extractSessionNo(sheet);
        // (컬럼 인덱스 → meetingNo, date) 맵
        Map<Integer, MeetingColumn> meetingColumns = extractMeetingColumns(sheet);

        if (sessionNo == 0 || meetingColumns.isEmpty()) {
            log.warn("파싱 실패: sessionNo={}, meetingColumns={}", sessionNo, meetingColumns.size());
            return List.of();
        }

        List<PlenaryAttendance> result = new ArrayList<>();
        int lastRow = sheet.getLastRowNum();

        for (int rowIdx = 4; rowIdx <= lastRow; rowIdx++) {
            Row row = sheet.getRow(rowIdx);
            if (row == null) continue;

            String name = cellStr(row, 0);
            if (name == null || name.isBlank()) continue;

            for (Map.Entry<Integer, MeetingColumn> entry : meetingColumns.entrySet()) {
                String statusStr = cellStr(row, entry.getKey());
                AttendanceStatus status = parseStatus(statusStr);
                if (status == null) continue; // 빈 셀은 스킵

                result.add(PlenaryAttendance.builder()
                        .memberName(name)
                        .sessionNo(sessionNo)
                        .meetingNo(entry.getValue().meetingNo())
                        .meetingDt(entry.getValue().date())
                        .status(status)
                        .fileSeq(fileSeq)
                        .build());
            }
        }

        log.info("fileSeq={} 파싱 완료: {}회 {}개 차수, {}건", fileSeq, sessionNo, meetingColumns.size(), result.size());
        return result;
    }

    // ── 내부 유틸 ────────────────────────────────────────────────────────────

    private static int extractSessionNo(Sheet sheet) {
        Row row = sheet.getRow(1);
        if (row == null) return 0;
        for (int col = 0; col < row.getLastCellNum(); col++) {
            String val = cellStr(row, col);
            if (val == null) continue;
            Matcher m = SESSION_PATTERN.matcher(val);
            if (m.find()) {
                return Integer.parseInt(m.group(1));
            }
        }
        return 0;
    }

    private static Map<Integer, MeetingColumn> extractMeetingColumns(Sheet sheet) {
        Row headerRow = sheet.getRow(2); // "N차(본회의)" 행
        Row dateRow   = sheet.getRow(3); // "(YYYY년MM월DD일)" 행
        if (headerRow == null || dateRow == null) return Map.of();

        Map<Integer, MeetingColumn> map = new LinkedHashMap<>();
        int lastCol = dateRow.getLastCellNum();

        for (int col = 2; col < lastCol; col++) {
            String dateStr = cellStr(dateRow, col);
            if (dateStr == null) continue;

            Matcher dm = DATE_PATTERN.matcher(dateStr);
            if (!dm.find()) continue; // 집계 열이면 날짜 형식이 아님 → 스킵

            LocalDate date = LocalDate.of(
                    Integer.parseInt(dm.group(1)),
                    Integer.parseInt(dm.group(2)),
                    Integer.parseInt(dm.group(3)));

            String headerStr = cellStr(headerRow, col);
            int meetingNo = 0;
            if (headerStr != null) {
                Matcher mm = MEETING_PATTERN.matcher(headerStr);
                if (mm.find()) meetingNo = Integer.parseInt(mm.group(1));
            }
            if (meetingNo == 0) continue;

            map.put(col, new MeetingColumn(meetingNo, date));
        }
        return map;
    }

    private static AttendanceStatus parseStatus(String val) {
        if (val == null || val.isBlank()) return null;
        return switch (val.trim()) {
            case "출석" -> AttendanceStatus.PRESENT;
            case "결석", "결석신고서" -> AttendanceStatus.ABSENT;
            case "청가" -> AttendanceStatus.LEAVE;
            case "출장" -> AttendanceStatus.OFFICIAL_TRIP;
            case "-" -> null; // 비례대표 승계 전 미해당 → 집계 제외
            default     -> {
                log.warn("알 수 없는 출결 상태: '{}'", val);
                yield null;
            }
        };
    }

    private static String cellStr(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BLANK   -> null;
            default      -> null;
        };
    }

    record MeetingColumn(int meetingNo, LocalDate date) {}
}
