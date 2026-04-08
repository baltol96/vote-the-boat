package com.assembly.application.vote;

import com.assembly.domain.vote.Vote;

import java.time.LocalDate;

public record VoteRecord(
        String billNo,
        String billName,
        LocalDate voteDt,
        String result,
        String billUrl,
        String currCommittee
) {
    public static VoteRecord from(Vote vote) {
        return new VoteRecord(
                vote.getBillNo(),
                vote.getBillName(),
                vote.getVoteDt(),
                vote.getResult().name(),
                vote.getBillUrl(),
                vote.getCurrCommittee()
        );
    }
}
