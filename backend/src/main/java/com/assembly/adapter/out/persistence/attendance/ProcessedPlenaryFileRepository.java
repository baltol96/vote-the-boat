package com.assembly.adapter.out.persistence.attendance;

import com.assembly.domain.attendance.ProcessedPlenaryFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;

public interface ProcessedPlenaryFileRepository extends JpaRepository<ProcessedPlenaryFile, Long> {

    @Query("SELECT f.fileSeq FROM ProcessedPlenaryFile f")
    Set<Long> findAllFileSeqs();
}
