package com.assembly.application.billinsight;

import com.assembly.domain.bill.Bill;
import com.assembly.domain.billkeyword.BillCategory;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record BillSummaryResult(
        int totalBills,
        List<CategorySummary> categories
) {
    public record CategorySummary(
            String category,
            int count,
            List<String> topKeywords
    ) {}

    public static BillSummaryResult from(List<Bill> bills) {
        Map<BillCategory, List<Bill>> byCategory = bills.stream()
                .collect(Collectors.groupingBy(
                        b -> BillCategoryClassifier.classify(b.getBillName())
                ));

        List<CategorySummary> categories = byCategory.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue().size(), a.getValue().size()))
                .map(entry -> new CategorySummary(
                        entry.getKey().name(),
                        entry.getValue().size(),
                        topKeywordsFor(entry.getValue())
                ))
                .collect(Collectors.toList());

        return new BillSummaryResult(bills.size(), categories);
    }

    private static List<String> topKeywordsFor(List<Bill> bills) {
        return bills.stream()
                .flatMap(b -> BillCategoryClassifier.extractKeywords(b.getBillName()).stream())
                .collect(Collectors.groupingBy(k -> k, Collectors.counting()))
                .entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}
