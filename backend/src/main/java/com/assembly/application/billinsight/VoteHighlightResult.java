package com.assembly.application.billinsight;

import com.assembly.domain.vote.Vote;

import java.time.LocalDate;

public record VoteHighlightResult(
        String billNo,
        String billName,
        LocalDate voteDt,
        String result,
        String billUrl,
        String committee
) {
    public static VoteHighlightResult from(Vote vote) {
        return new VoteHighlightResult(
                vote.getBillNo(),
                vote.getBillName(),
                vote.getVoteDt(),
                vote.getResult().name(),
                vote.getBillUrl(),
                vote.getCurrCommittee()
        );
    }
}
