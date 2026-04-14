package com.assembly.adapter.out.persistence.vote;

import com.assembly.domain.vote.Vote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoteJpaRepository extends JpaRepository<Vote, Long> {

    Page<Vote> findByMonaCdOrderByVoteDtDesc(String monaCd, Pageable pageable);

    Page<Vote> findByMonaCdAndResultOrderByVoteDtDesc(String monaCd, com.assembly.domain.vote.VoteResult result, Pageable pageable);

    @Query("SELECT COUNT(v) FROM Vote v WHERE v.monaCd = :monaCd")
    long countTotalByMonaCd(@Param("monaCd") String monaCd);

    @Query("SELECT COUNT(v) FROM Vote v WHERE v.monaCd = :monaCd AND v.result != 'ABSENT'")
    long countAttendedByMonaCd(@Param("monaCd") String monaCd);

    @Query("SELECT COUNT(v) FROM Vote v WHERE v.monaCd = :monaCd AND v.result = :result")
    long countByMonaCdAndResult(@Param("monaCd") String monaCd, @Param("result") com.assembly.domain.vote.VoteResult result);

    boolean existsByMonaCdAndBillNo(String monaCd, String billNo);
}
