package com.assembly.adapter.out.persistence.attendance;

import com.assembly.domain.attendance.ProcessedCommitteeFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;

public interface ProcessedCommitteeFileRepository extends JpaRepository<ProcessedCommitteeFile, Long> {

    @Query("SELECT f.fileSeq FROM ProcessedCommitteeFile f")
    Set<Long> findAllFileSeqs();
}
