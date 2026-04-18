package com.assembly.application.billinsight.port.in;

import com.assembly.application.billinsight.BillSummaryResult;
import com.assembly.application.billinsight.VoteHighlightResult;

import java.util.List;

public interface GetBillInsightUseCase {
    BillSummaryResult getBillSummary(String monaCd);
    List<VoteHighlightResult> getVoteHighlights(String monaCd);
}
