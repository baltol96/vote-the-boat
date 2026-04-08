package com.assembly.application.member;

import com.assembly.application.member.port.in.GetMemberUseCase;
import com.assembly.application.member.port.in.SearchMemberUseCase;
import com.assembly.application.member.port.out.MemberPort;
import com.assembly.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberQueryService implements GetMemberUseCase, SearchMemberUseCase {

    private final MemberPort memberPort;

    @Override
    public MemberResult getMember(String monaCd) {
        return memberPort.findByMonaCd(monaCd)
                .map(MemberResult::from)
                .orElseThrow(() -> new ResourceNotFoundException("의원을 찾을 수 없습니다: " + monaCd));
    }

    @Override
    public MemberResult getMemberBySggCode(String sggCode) {
        return memberPort.findActiveBySggCode(sggCode)
                .map(MemberResult::from)
                .orElseThrow(() -> new ResourceNotFoundException("해당 선거구 의원을 찾을 수 없습니다: " + sggCode));
    }

    @Override
    public void validateExists(String monaCd) {
        if (!memberPort.existsByMonaCd(monaCd)) {
            throw new ResourceNotFoundException("의원을 찾을 수 없습니다: " + monaCd);
        }
    }

    @Override
    public List<HistoricalRepresentativeResult> getDistrictHistory(String sggCode) {
        String district = memberPort.findDistrictNameBySggCode(sggCode)
                .orElseThrow(() -> new ResourceNotFoundException("선거구 정보를 찾을 수 없습니다: " + sggCode));
        return memberPort.findTermsByDistrict(district).stream()
                .map(HistoricalRepresentativeResult::from)
                .toList();
    }

    @Override
    public List<MemberResult> search(String name, String party) {
        return memberPort.searchActive(name, party).stream()
                .map(MemberResult::from)
                .toList();
    }
}
