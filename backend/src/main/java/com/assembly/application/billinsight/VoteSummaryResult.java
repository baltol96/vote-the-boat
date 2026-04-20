package com.assembly.application.billinsight;

import java.util.List;

public record VoteSummaryResult(
        int totalVotes,
        List<CategoryVoteSummary> categories
) {
    public record CategoryVoteSummary(
            String category,
            int yes,
            int no,
            int abstain,
            List<String> topKeywords
    ) {}
}
