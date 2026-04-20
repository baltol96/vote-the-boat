package com.assembly.adapter.out.batch;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 공직자 정기재산공개 PDF 파서 (재산변동신고 형식).
 *
 * 실제 PDF 구조:
 *   소속 국회 직위 XX 성명 [이름]      ← 의원 시작
 *   ▶ 토지(소계) [종전] [증가] [감소] [현재가액]   ← 카테고리 + 소계 한 행
 *   본인 임야 ...                       ← 개별 항목 (건수 카운트용)
 *   총 계 [종전] [순증감] [감소] [현재가액]   ← 합계
 *
 * 금액: PDF 원본 천원 단위 반환.
 * 전체 페이지를 한 번에 수집 후 상태 머신 실행 (멤버가 페이지 경계를 넘을 수 있음).
 */
@Slf4j
public class AssetPdfParser {

    private static final Pattern NAME_AFTER_SUNGMYEONG = Pattern.compile("[가-힣]{2,5}");
    private static final Set<String> RELATIONS = Set.of(
            "본인", "배우자", "부", "모", "장남", "장녀", "차남", "차녀",
            "삼남", "삼녀", "자녀", "형", "형제", "누나", "언니", "오빠", "자"
    );

    private AssetPdfParser() {}

    public record ItemData(String relation, String desc, long amountCheonwon) {}
    public record CategoryData(String name, int count, long amountCheonwon, List<ItemData> items) {}
    public record MemberAssetData(String name, long totalCheonwon, List<CategoryData> categories) {}

    private record TextChunk(float x, float y, String text) {}
    private record Row(List<TextChunk> tokens) {
        String firstText() { return tokens.isEmpty() ? "" : tokens.get(0).text(); }
        String text() { return tokens.stream().map(TextChunk::text).reduce("", String::concat); }
    }

    // ── 진입점 ───────────────────────────────────────────────────────────────

    public static List<MemberAssetData> parse(String pdfPath) throws IOException {
        return parse(Files.readAllBytes(Path.of(pdfPath)));
    }

    public static List<MemberAssetData> parse(byte[] pdfBytes) throws IOException {
        List<TextChunk> allChunks = new ArrayList<>();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            int total = doc.getNumberOfPages();
            log.info("재산 PDF 파싱 시작: 총 {}페이지", total);

            // 전체 페이지를 한 번에 수집 (멤버가 페이지 경계를 넘을 수 있으므로)
            AssetStripper stripper = new AssetStripper();
            stripper.setStartPage(3); // 1~2페이지: 표지/공지
            stripper.setEndPage(total);
            stripper.getText(doc);
            allChunks.addAll(stripper.getChunks());
        }

        List<Row> rows = groupIntoRows(allChunks);
        List<MemberAssetData> results = extractMembers(rows);

        log.info("재산 PDF 파싱 완료: {}명", results.size());
        return results;
    }

    // ── 상태 머신 ────────────────────────────────────────────────────────────

    private static List<MemberAssetData> extractMembers(List<Row> rows) {
        List<MemberAssetData> results = new ArrayList<>();

        String currentName = null;
        long currentTotal = 0;
        List<CategoryData> currentCategories = new ArrayList<>();
        String currentCategoryName = null;
        long currentCategoryAmount = 0;
        int currentItemCount = 0;
        List<ItemData> currentItems = new ArrayList<>();

        for (Row row : rows) {
            String fullText = row.text();

            // 의원 시작: "국회"와 "성명" 모두 포함
            if (fullText.contains("국회") && fullText.contains("성명")) {
                String name = extractNameFromText(fullText);
                if (name == null) continue;

                // 이전 의원 저장
                if (currentName != null && currentTotal > 0) {
                    savePendingCategory(currentCategories, currentCategoryName, currentItemCount, currentCategoryAmount, currentItems);
                    results.add(new MemberAssetData(currentName, currentTotal, List.copyOf(currentCategories)));
                }

                currentName = name;
                currentTotal = 0;
                currentCategories = new ArrayList<>();
                currentCategoryName = null;
                currentCategoryAmount = 0;
                currentItemCount = 0;
                currentItems = new ArrayList<>();
                continue;
            }

            if (currentName == null) continue;

            // 카테고리 행: "▶" 포함 (소계 금액이 같은 행에 있음)
            if (fullText.contains("▶")) {
                savePendingCategory(currentCategories, currentCategoryName, currentItemCount, currentCategoryAmount, currentItems);
                currentCategoryName = extractCategoryName(row);
                long amt = extractLastNumber(row);
                currentCategoryAmount = (amt != Long.MIN_VALUE) ? amt : 0;
                currentItemCount = 0;
                currentItems = new ArrayList<>();
                continue;
            }

            // 합계 행: 첫 토큰이 "총"으로 시작
            if (row.firstText().startsWith("총") && fullText.contains("계")) {
                long total = extractLastNumber(row);
                if (total > 0) {
                    currentTotal = total;
                    savePendingCategory(currentCategories, currentCategoryName, currentItemCount, currentCategoryAmount, currentItems);
                    currentCategoryName = null;
                    currentItems = new ArrayList<>();
                }
                continue;
            }

            // 개별 항목 행: 첫 토큰이 관계 키워드 (건수 카운트 + 세부 캡처)
            if (currentCategoryName != null && RELATIONS.contains(row.firstText())) {
                currentItemCount++;
                currentItems.add(extractItemData(row));
            }
        }

        // 마지막 의원 저장
        if (currentName != null && currentTotal > 0) {
            savePendingCategory(currentCategories, currentCategoryName, currentItemCount, currentCategoryAmount, currentItems);
            results.add(new MemberAssetData(currentName, currentTotal, List.copyOf(currentCategories)));
        }

        return results;
    }

    private static void savePendingCategory(
            List<CategoryData> categories, String name, int count, long amount, List<ItemData> items) {
        if (name != null) {
            categories.add(new CategoryData(name, count, amount, List.copyOf(items)));
        }
    }

    private static ItemData extractItemData(Row row) {
        List<TextChunk> tokens = row.tokens();
        String relation = tokens.isEmpty() ? "" : tokens.get(0).text();
        StringBuilder desc = new StringBuilder();
        for (int i = 1; i < tokens.size(); i++) {
            String t = tokens.get(i).text().replace(",", "").trim();
            if (isPureNumber(t) || t.equals("-")) break;
            if (!desc.isEmpty()) desc.append(" ");
            desc.append(tokens.get(i).text().trim());
        }
        long amount = extractLastNumber(row);
        return new ItemData(relation, desc.toString().trim(), Math.max(0, amount == Long.MIN_VALUE ? 0 : amount));
    }

    // ── 텍스트 추출 유틸 ─────────────────────────────────────────────────────

    private static String extractNameFromText(String fullText) {
        int idx = fullText.indexOf("성명");
        if (idx < 0) return null;
        String afterKeyword = fullText.substring(idx + 2);
        Matcher m = NAME_AFTER_SUNGMYEONG.matcher(afterKeyword);
        return m.find() ? m.group() : null;
    }

    private static String extractCategoryName(Row row) {
        StringBuilder sb = new StringBuilder();
        boolean pastArrow = false;
        for (TextChunk t : row.tokens()) {
            String text = t.text();
            if (!pastArrow) {
                if (text.startsWith("▶")) {
                    pastArrow = true;
                    String rest = text.substring(1).trim();
                    if (!rest.isBlank() && !isPureNumber(rest)) sb.append(rest);
                }
                continue;
            }
            // 숫자 토큰이 나오면 카테고리명 끝
            if (isPureNumber(text.replace(",", "").replace("-", "").trim())) break;
            sb.append(text);
        }
        return sb.toString()
                .replace("(소계)", "")
                .replace("소계", "")
                .trim();
    }

    private static boolean isPureNumber(String s) {
        return !s.isBlank() && s.matches("-?\\d+");
    }

    private static long extractLastNumber(Row row) {
        List<TextChunk> tokens = row.tokens();
        for (int i = tokens.size() - 1; i >= 0; i--) {
            String t = tokens.get(i).text().replace(",", "").trim();
            if (!t.isEmpty() && t.matches("-?\\d+")) {
                try { return Long.parseLong(t); } catch (NumberFormatException ignored) {}
            }
        }
        return Long.MIN_VALUE;
    }

    // ── 행 그룹핑 ────────────────────────────────────────────────────────────

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

    // ── PDF 텍스트 스트리퍼 ──────────────────────────────────────────────────

    private static class AssetStripper extends PDFTextStripper {
        private final List<TextChunk> chunks = new ArrayList<>();

        AssetStripper() throws IOException {
            setSortByPosition(false);
        }

        List<TextChunk> getChunks() { return chunks; }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            if (textPositions == null || textPositions.isEmpty()) return;

            // 페이지별 Y 오프셋: 페이지 간 행 혼합 방지
            float yOffset = (getCurrentPageNo() - 1) * 10000f;

            StringBuilder currentToken = new StringBuilder();
            float tokenX = 0, tokenY = 0;
            float prevEndX = -1;

            for (TextPosition tp : textPositions) {
                String unicode = tp.getUnicode();
                if (unicode == null || unicode.isBlank()) {
                    flushToken(currentToken, tokenX, tokenY + yOffset);
                    currentToken = new StringBuilder();
                    prevEndX = -1;
                    continue;
                }

                float charX = tp.getXDirAdj();
                float charY = tp.getYDirAdj();
                float charW = tp.getWidthDirAdj();

                if (prevEndX < 0) {
                    tokenX = charX;
                    tokenY = charY;
                    currentToken.append(unicode);
                    prevEndX = charX + charW;
                    continue;
                }

                float gap = charX - prevEndX;
                float threshold = Math.max(tp.getFontSizeInPt() * 0.35f, 2f);

                if (gap > threshold) {
                    flushToken(currentToken, tokenX, tokenY + yOffset);
                    currentToken = new StringBuilder();
                    tokenX = charX;
                    tokenY = charY;
                }
                currentToken.append(unicode);
                prevEndX = charX + charW;
            }
            flushToken(currentToken, tokenX, tokenY + yOffset);
        }

        private void flushToken(StringBuilder sb, float x, float y) {
            if (sb.length() > 0) {
                chunks.add(new TextChunk(x, y, sb.toString()));
                sb.setLength(0);
            }
        }
    }
}
