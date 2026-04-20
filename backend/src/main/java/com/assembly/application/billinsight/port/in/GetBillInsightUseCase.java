package com.assembly.application.billinsight.port.in;

import com.assembly.application.billinsight.BillSummaryResult;
import com.assembly.application.billinsight.VoteSummaryResult;

public interface GetBillInsightUseCase {
    BillSummaryResult getBillSummary(String monaCd);
    VoteSummaryResult getVoteHighlights(String monaCd);
}
