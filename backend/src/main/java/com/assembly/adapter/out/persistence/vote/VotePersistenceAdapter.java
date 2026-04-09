package com.assembly.adapter.out.persistence.vote;

import com.assembly.application.vote.port.out.VotePort;
import com.assembly.domain.vote.Vote;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class VotePersistenceAdapter implements VotePort {

    private final VoteJpaRepository voteJpaRepository;

    @Override
    public Page<Vote> findByMonaCdOrderByVoteDtDesc(String monaCd, Pageable pageable) {
        return voteJpaRepository.findByMonaCdOrderByVoteDtDesc(monaCd, pageable);
    }

    @Override
    public long countTotalByMonaCd(String monaCd) {
        return voteJpaRepository.countTotalByMonaCd(monaCd);
    }

    @Override
    public long countAttendedByMonaCd(String monaCd) {
        return voteJpaRepository.countAttendedByMonaCd(monaCd);
    }

    @Override
    public long countByMonaCdAndResult(String monaCd, com.assembly.domain.vote.VoteResult result) {
        return voteJpaRepository.countByMonaCdAndResult(monaCd, result);
    }

    @Override
    public boolean existsByMonaCdAndBillNo(String monaCd, String billNo) {
        return voteJpaRepository.existsByMonaCdAndBillNo(monaCd, billNo);
    }

    @Override
    public List<Vote> saveAll(List<Vote> votes) {
        return voteJpaRepository.saveAll(votes);
    }

    @Override
    @Transactional
    public void deleteAll() {
        voteJpaRepository.deleteAll();
    }
}
