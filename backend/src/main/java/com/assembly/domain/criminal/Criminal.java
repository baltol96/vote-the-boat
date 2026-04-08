package com.assembly.domain.criminal;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "criminals", indexes = {
        @Index(name = "idx_criminal_mona_cd", columnList = "monaCd")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Criminal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String monaCd;

    @Column(nullable = false, length = 100)
    private String crimeType; // 범죄 유형

    @Column(length = 50)
    private String sentence; // 형량

    @Column(length = 200)
    private String court; // 법원

    @Column(columnDefinition = "TEXT")
    private String detail; // 상세 내용

    @Column(nullable = false)
    private Integer electionYear; // 수집 기준 선거 연도

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Builder
    public Criminal(String monaCd, String crimeType, String sentence,
                    String court, String detail, Integer electionYear) {
        this.monaCd = monaCd;
        this.crimeType = crimeType;
        this.sentence = sentence;
        this.court = court;
        this.detail = detail;
        this.electionYear = electionYear;
    }
}
