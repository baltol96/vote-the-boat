package com.assembly.application.billinsight;

import com.assembly.domain.billkeyword.BillCategory;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class BillCategoryClassifier {

    private static final Map<BillCategory, List<String>> CATEGORY_KEYWORDS = new LinkedHashMap<>();

    static {
        CATEGORY_KEYWORDS.put(BillCategory.복지, List.of(
                "건강보험", "의료", "복지", "장애", "노인", "장애인", "보육", "아동", "보건",
                "사회서비스", "기초생활", "의약", "병원", "환자", "간호", "요양", "돌봄",
                "저출산", "출산", "임산부", "사회보장", "국민연금", "고령"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.교육, List.of(
                "교육", "학교", "학생", "교원", "교사", "유아", "대학", "학업",
                "교과", "수업", "입시", "장학", "유치원", "어린이집", "청소년", "학원", "교육부"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.경제, List.of(
                "세금", "조세", "금융", "기업", "중소기업", "산업", "무역", "수출", "투자",
                "예산", "경제", "통상", "창업", "벤처", "부동산", "주택", "임대", "상업",
                "소비자", "물가", "은행", "세율", "세제", "근로", "임금", "노동", "고용"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.법무, List.of(
                "형사", "수사", "검찰", "범죄", "처벌", "법원", "소송", "재판", "형법",
                "법무", "교도", "피해자", "공수처", "형사소송", "민사", "등기", "사법"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.환경, List.of(
                "환경", "기후", "탄소", "온실가스", "에너지", "폐기물", "재생에너지", "생태",
                "자연", "동물", "산림", "수질", "대기", "미세먼지", "재활용", "청정", "생물"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.안보, List.of(
                "국방", "군사", "병역", "안보", "군인", "방위", "재난", "소방",
                "경찰", "안전", "방재", "비상", "국가보안", "군", "방산"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.행정, List.of(
                "행정", "공무원", "정부", "지방자치", "자치", "선거", "공공기관", "지방",
                "국가", "부처", "정책", "규제", "행정부", "국회", "의회"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.문화, List.of(
                "문화", "예술", "스포츠", "체육", "관광", "방송", "콘텐츠", "영화",
                "미디어", "저작권", "언론", "출판", "게임", "한류"
        ));
        CATEGORY_KEYWORDS.put(BillCategory.과학기술, List.of(
                "과학", "기술", "연구", "디지털", "인공지능", "데이터", "통신", "정보",
                "반도체", "우주", "바이오", "ICT", "소프트웨어", "인터넷", "AI", "첨단"
        ));
    }

    private BillCategoryClassifier() {}

    public static BillCategory classify(String billName) {
        if (billName == null || billName.isBlank()) return BillCategory.기타;

        BillCategory best = BillCategory.기타;
        long bestCount = 0;

        for (var entry : CATEGORY_KEYWORDS.entrySet()) {
            long count = entry.getValue().stream()
                    .filter(billName::contains)
                    .count();
            if (count > bestCount) {
                bestCount = count;
                best = entry.getKey();
            }
        }
        return best;
    }

    public static List<String> extractKeywords(String billName) {
        if (billName == null || billName.isBlank()) return List.of();
        return CATEGORY_KEYWORDS.values().stream()
                .flatMap(List::stream)
                .filter(billName::contains)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());
    }
}
