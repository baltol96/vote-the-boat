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

/** 처리 완료된 본회의 출결현황 파일 이력. 재처리 방지용. */
@Entity
@Table(name = "processed_plenary_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessedPlenaryFile {

    @Id
    private Long fileSeq;

    @Column(nullable = false)
    private Integer sessionNo;

    @Column(nullable = false, length = 100)
    private String fileName;

    @Column(nullable = false)
    private Integer rowCount;

    @Column(nullable = false)
    private LocalDateTime processedAt;

    @Builder
    public ProcessedPlenaryFile(Long fileSeq, Integer sessionNo,
                                String fileName, Integer rowCount) {
        this.fileSeq = fileSeq;
        this.sessionNo = sessionNo;
        this.fileName = fileName;
        this.rowCount = rowCount;
        this.processedAt = LocalDateTime.now();
    }
}
