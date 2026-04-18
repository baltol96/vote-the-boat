package com.assembly.application.billinsight;

import com.assembly.application.billinsight.port.in.GetBillInsightUseCase;
import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.member.port.in.GetMemberUseCase;
import com.assembly.application.vote.port.out.VotePort;
import com.assembly.domain.vote.VoteResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    public List<VoteHighlightResult> getVoteHighlights(String monaCd) {
        getMemberUseCase.validateExists(monaCd);
        return votePort.findByMonaCdOrderByVoteDtDesc(monaCd, PageRequest.of(0, 50))
                .getContent().stream()
                .filter(v -> v.getResult() != VoteResult.ABSENT)
                .limit(20)
                .map(VoteHighlightResult::from)
                .collect(Collectors.toList());
    }
}
