package com.assembly.adapter.out.persistence.member;

import com.assembly.domain.member.Member;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MemberJpaRepository extends JpaRepository<Member, Long> {

    List<Member> findByName(String name);

    @EntityGraph(attributePaths = "terms")
    Optional<Member> findByMonaCd(String monaCd);

    // 선거구 sggCode 기준 현역 의원 조회 (member_terms JOIN)
    @Query("SELECT m FROM Member m JOIN FETCH m.terms t " +
           "WHERE t.sggCode = :sggCode AND m.status = 'ACTIVE'")
    Optional<Member> findActiveBySggCode(@Param("sggCode") String sggCode);

    @Query("SELECT DISTINCT m FROM Member m LEFT JOIN FETCH m.terms t WHERE " +
           "(:name IS NULL OR m.name LIKE %:name%) AND " +
           "(:party IS NULL OR t.party = :party) AND " +
           "m.status = 'ACTIVE'")
    List<Member> searchActive(@Param("name") String name,
                              @Param("party") String party);

    boolean existsByMonaCd(String monaCd);

    @Query("SELECT m.monaCd FROM Member m WHERE m.status = 'ACTIVE'")
    List<String> findAllActiveMonaCds();

    @Query("SELECT DISTINCT t.termNumber FROM MemberTerm t WHERE t.member.status = 'ACTIVE'")
    List<Integer> findDistinctTermNumbersByActiveMembers();

    @Query("SELECT DISTINCT m FROM Member m JOIN m.terms t WHERE m.name = :name AND t.party = :party ORDER BY m.id")
    List<Member> findByNameAndParty(@Param("name") String name, @Param("party") String party);
}
