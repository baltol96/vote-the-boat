package com.assembly.application.asset;

import java.util.List;

public record AssetResult(
        Integer declareYear,
        Long totalAmountManwon,
        List<CategoryResult> categories
) {
    public record ItemResult(String relation, String desc, Long amountManwon) {}

    public record CategoryResult(
            String name,
            int count,
            Long amountManwon,
            double percentage,
            List<ItemResult> items
    ) {}
}
