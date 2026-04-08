package com.assembly.application.criminal.port.out;

import com.assembly.domain.criminal.Criminal;

import java.util.List;

public interface CriminalPort {
    List<Criminal> findByMonaCdOrderByElectionYearDesc(String monaCd);
    boolean existsByMonaCdAndElectionYear(String monaCd, Integer electionYear);
    Criminal save(Criminal criminal);
}
