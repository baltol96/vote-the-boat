package com.assembly.adapter.out.persistence.criminal;

import com.assembly.domain.criminal.Criminal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CriminalJpaRepository extends JpaRepository<Criminal, Long> {

    List<Criminal> findByMonaCdOrderByElectionYearDesc(String monaCd);

    boolean existsByMonaCdAndElectionYear(String monaCd, Integer electionYear);
}
