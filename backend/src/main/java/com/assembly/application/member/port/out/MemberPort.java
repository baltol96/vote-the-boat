package com.assembly.application.member.port.out;

import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberTerm;

import java.util.List;
import java.util.Optional;

public interface MemberPort {
    Optional<Member> findByMonaCd(String monaCd);
    Optional<Member> findActiveBySggCode(String sggCode);
    List<Member> searchActive(String name, String party);
    boolean existsByMonaCd(String monaCd);
    Member save(Member member);
    List<Member> findByName(String name);
    Optional<String> findDistrictNameBySggCode(String sggCode);
    List<MemberTerm> findTermsByDistrict(String district);
}
