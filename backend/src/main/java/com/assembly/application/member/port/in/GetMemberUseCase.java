package com.assembly.application.member.port.in;

import com.assembly.application.member.HistoricalRepresentativeResult;
import com.assembly.application.member.MemberResult;

import java.util.List;

public interface GetMemberUseCase {
    MemberResult getMember(String monaCd);
    MemberResult getMemberBySggCode(String sggCode);
    void validateExists(String monaCd);
    List<HistoricalRepresentativeResult> getDistrictHistory(String sggCode);
}
