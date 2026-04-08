package com.assembly.application.member;

import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberTerm;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MemberResult(
        String monaCd,
        String name,
        String nameHan,
        String party,
        String district,
        String sggCode,
        String electionType,
        List<Integer> termNumbers,   // 당선 대수 목록 (예: [12, 14, 22])
        LocalDate birthDate,
        String gender,
        String photoUrl,
        String email,
        String phone,
        String officeRoom,
        String status,
        // 역대국회의원현황 API 전기 정보
        String bon,
        String posi,
        String hak,
        String hobby,
        String book,
        String sang,
        String dead,
        String heritageUrl
) {
    public static MemberResult from(Member member) {
        MemberTerm current = member.currentTerm();
        List<Integer> termNumbers = member.getTerms().stream()
                .map(MemberTerm::getTermNumber)
                .sorted()
                .toList();
        return new MemberResult(
                member.getMonaCd(),
                member.getName(),
                member.getNameHan(),
                current != null ? current.getParty() : null,
                current != null ? current.getDistrict() : null,
                current != null ? current.getSggCode() : null,
                current != null ? current.getElectionType() : null,
                termNumbers.isEmpty() ? null : termNumbers,
                member.getBirthDate(),
                member.getGender(),
                member.getPhotoUrl(),
                member.getEmail(),
                member.getPhone(),
                member.getOfficeRoom(),
                member.getStatus().name(),
                member.getBon(),
                member.getPosi(),
                member.getHak(),
                member.getHobby(),
                member.getBook(),
                member.getSang(),
                member.getDead(),
                member.getHeritageUrl()
        );
    }
}
