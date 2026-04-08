package com.assembly.application.member;

import com.assembly.domain.member.MemberTerm;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record HistoricalRepresentativeResult(
        Integer termNumber,
        String name,
        String nameHan,
        String party,
        String district,
        String electionType,
        String monaCd,
        String photoUrl
) {
    public static HistoricalRepresentativeResult from(MemberTerm term) {
        var member = term.getMember();
        return new HistoricalRepresentativeResult(
                term.getTermNumber(),
                member.getName(),
                member.getNameHan(),
                term.getParty(),
                term.getDistrict(),
                term.getElectionType(),
                member.getMonaCd(),
                member.getPhotoUrl()
        );
    }
}
