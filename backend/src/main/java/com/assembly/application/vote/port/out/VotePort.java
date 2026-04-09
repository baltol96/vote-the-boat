package com.assembly.application.vote.port.out;

import com.assembly.domain.vote.Vote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VotePort {
    Page<Vote> findByMonaCdOrderByVoteDtDesc(String monaCd, Pageable pageable);
    long countTotalByMonaCd(String monaCd);
    long countAttendedByMonaCd(String monaCd);
    long countByMonaCdAndResult(String monaCd, com.assembly.domain.vote.VoteResult result);
    boolean existsByMonaCdAndBillNo(String monaCd, String billNo);
    List<Vote> saveAll(List<Vote> votes);
    void deleteAll();
}
