package com.assembly.application.billinsight;

import com.assembly.application.billinsight.port.in.GetBillInsightUseCase;
import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.member.port.in.GetMemberUseCase;
import com.assembly.application.vote.port.out.VotePort;
import com.assembly.domain.billkeyword.BillCategory;
import com.assembly.domain.vote.Vote;
import com.assembly.domain.vote.VoteResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillInsightQueryService implements GetBillInsightUseCase {

    private final BillPort billPort;
    private final VotePort votePort;
    private final GetMemberUseCase getMemberUseCase;

    @Override
    public BillSummaryResult getBillSummary(String monaCd) {
        getMemberUseCase.validateExists(monaCd);
        return BillSummaryResult.from(billPort.findAllByMonaCd(monaCd));
    }

    @Override
    public VoteSummaryResult getVoteHighlights(String monaCd) {
        getMemberUseCase.validateExists(monaCd);

        List<Vote> votes = votePort.findByMonaCdOrderByVoteDtDesc(monaCd, PageRequest.of(0, 200))
                .getContent().stream()
                .filter(v -> v.getResult() != VoteResult.ABSENT)
                .collect(Collectors.toList());

        // 카테고리별 찬성/반대/기권 집계
        Map<BillCategory, int[]> countMap = new LinkedHashMap<>();
        Map<BillCategory, List<Vote>> votesByCategory = new LinkedHashMap<>();

        for (Vote vote : votes) {
            BillCategory category = BillCategoryClassifier.classify(vote.getBillName());
            countMap.computeIfAbsent(category, k -> new int[3]);
            votesByCategory.computeIfAbsent(category, k -> new ArrayList<>());

            int[] counts = countMap.get(category);
            switch (vote.getResult()) {
                case YES     -> counts[0]++;
                case NO      -> counts[1]++;
                case ABSTAIN -> counts[2]++;
            }
            votesByCategory.get(category).add(vote);
        }

        List<VoteSummaryResult.CategoryVoteSummary> categories = countMap.entrySet().stream()
                .sorted((a, b) -> {
                    int[] ca = a.getValue(), cb = b.getValue();
                    return Integer.compare(cb[0] + cb[1] + cb[2], ca[0] + ca[1] + ca[2]);
                })
                .map(entry -> {
                    BillCategory cat = entry.getKey();
                    int[] c = entry.getValue();
                    List<String> topKeywords = topKeywordsFor(votesByCategory.get(cat));
                    return new VoteSummaryResult.CategoryVoteSummary(cat.name(), c[0], c[1], c[2], topKeywords);
                })
                .collect(Collectors.toList());

        return new VoteSummaryResult(votes.size(), categories);
    }

    private static List<String> topKeywordsFor(List<Vote> votes) {
        return votes.stream()
                .flatMap(v -> BillCategoryClassifier.extractKeywords(v.getBillName()).stream())
                .collect(Collectors.groupingBy(k -> k, Collectors.counting()))
                .entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}
