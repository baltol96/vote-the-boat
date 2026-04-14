package com.assembly.domain.attendance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 처리 완료된 상임위/특위 출결현황 파일 이력. 재처리 방지용. */
@Entity
@Table(name = "processed_committee_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessedCommitteeFile {

    @Id
    private Long fileSeq;

    /** 파일에 포함된 첫 번째 위원회명 (또는 파일명) */
    @Column(nullable = false, length = 200)
    private String committeeName;

    @Column(nullable = false, length = 200)
    private String fileName;

    @Column(nullable = false)
    private Integer rowCount;

    @Column(nullable = false)
    private LocalDateTime processedAt;

    @Builder
    public ProcessedCommitteeFile(Long fileSeq, String committeeName,
                                  String fileName, Integer rowCount) {
        this.fileSeq = fileSeq;
        this.committeeName = committeeName;
        this.fileName = fileName;
        this.rowCount = rowCount;
        this.processedAt = LocalDateTime.now();
    }
}
