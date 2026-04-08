package com.assembly.adapter.out.persistence.member;

import com.assembly.domain.member.Member;
import com.assembly.domain.member.MemberTerm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MemberTermRepository extends JpaRepository<MemberTerm, Long> {

    Optional<MemberTerm> findByMemberAndTermNumber(Member member, Integer termNumber);

    @Query("SELECT t.district FROM MemberTerm t WHERE t.sggCode = :sggCode")
    Optional<String> findDistrictNameBySggCode(@Param("sggCode") String sggCode);

    @Query("SELECT t FROM MemberTerm t JOIN FETCH t.member WHERE t.district = :district ORDER BY t.termNumber DESC")
    List<MemberTerm> findByDistrictOrderByTermNumberDesc(@Param("district") String district);
}
