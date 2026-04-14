package com.assembly.application.attendance.port.out;

import com.assembly.domain.attendance.ProcessedCommitteeFile;

import java.util.Set;

public interface ProcessedCommitteeFilePort {
    Set<Long> findAllFileSeqs();
    ProcessedCommitteeFile save(ProcessedCommitteeFile file);
}
