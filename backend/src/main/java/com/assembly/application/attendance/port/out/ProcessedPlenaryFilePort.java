package com.assembly.application.attendance.port.out;

import com.assembly.domain.attendance.ProcessedPlenaryFile;

import java.util.Set;

public interface ProcessedPlenaryFilePort {
    Set<Long> findAllFileSeqs();
    ProcessedPlenaryFile save(ProcessedPlenaryFile file);
}
