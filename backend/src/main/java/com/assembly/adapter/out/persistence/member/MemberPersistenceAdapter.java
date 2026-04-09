package com.assembly.adapter.out.persistence.member;

import com.assembly.application.member.port.out.MemberPort;
import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberTerm;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MemberPersistenceAdapter implements MemberPort {

    private final MemberJpaRepository memberJpaRepository;
    private final MemberTermRepository memberTermRepository;

    @Override
    public Optional<Member> findByMonaCd(String monaCd) {
        return memberJpaRepository.findByMonaCd(monaCd);
    }

    @Override
    public Optional<Member> findActiveBySggCode(String sggCode) {
        return memberJpaRepository.findActiveBySggCode(sggCode);
    }

    @Override
    public List<Member> searchActive(String name, String party) {
        return memberJpaRepository.searchActive(name, party);
    }

    @Override
    public boolean existsByMonaCd(String monaCd) {
        return memberJpaRepository.existsByMonaCd(monaCd);
    }

    @Override
    public Member save(Member member) {
        return memberJpaRepository.save(member);
    }

    @Override
    public List<Member> findByName(String name) {
        return memberJpaRepository.findByName(name);
    }

    @Override
    public Optional<String> findDistrictNameBySggCode(String sggCode) {
        return memberTermRepository.findDistrictNameBySggCode(sggCode);
    }

    @Override
    public List<MemberTerm> findTermsByDistrict(String district) {
        return memberTermRepository.findByDistrictOrderByTermNumberDesc(district);
    }

    @Override
    public List<String> findAllActiveMonaCds() {
        return memberJpaRepository.findAllActiveMonaCds();
    }

    @Override
    public List<Integer> findDistinctTermNumbersByActiveMembers() {
        return memberJpaRepository.findDistinctTermNumbersByActiveMembers();
    }
}
