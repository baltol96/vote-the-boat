package com.assembly.adapter.out.persistence.criminal;

import com.assembly.application.criminal.port.out.CriminalPort;
import com.assembly.domain.criminal.Criminal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CriminalPersistenceAdapter implements CriminalPort {

    private final CriminalJpaRepository criminalJpaRepository;

    @Override
    public List<Criminal> findByMonaCdOrderByElectionYearDesc(String monaCd) {
        return criminalJpaRepository.findByMonaCdOrderByElectionYearDesc(monaCd);
    }

    @Override
    public boolean existsByMonaCdAndElectionYear(String monaCd, Integer electionYear) {
        return criminalJpaRepository.existsByMonaCdAndElectionYear(monaCd, electionYear);
    }

    @Override
    public Criminal save(Criminal criminal) {
        return criminalJpaRepository.save(criminal);
    }
}
