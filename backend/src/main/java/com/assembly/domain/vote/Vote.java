package com.assembly.domain.vote;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "votes", indexes = {
        @Index(name = "idx_vote_mona_cd", columnList = "monaCd"),
        @Index(name = "idx_vote_bill_no", columnList = "billNo"),
        @Index(name = "idx_vote_mona_cd_vote_dt", columnList = "monaCd, voteDt")
},
        uniqueConstraints = @UniqueConstraint(
                name = "uk_vote_mona_cd_bill_no",
                columnNames = {"monaCd", "billNo"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String monaCd;

    @Column(nullable = false, length = 30)
    private String billNo;

    @Column(nullable = false, length = 200)
    private String billName;

    private LocalDate voteDt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VoteResult result; // 찬성/반대/기권/불참

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Column(length = 100)
    private String billId;

    @Column(length = 500)
    private String billUrl;

    @Column(length = 100)
    private String currCommittee;

    @Builder
    public Vote(String monaCd, String billNo, String billName,
                LocalDate voteDt, VoteResult result,
                String billId, String billUrl, String currCommittee) {
        this.monaCd = monaCd;
        this.billNo = billNo;
        this.billName = billName;
        this.voteDt = voteDt;
        this.result = result;
        this.billId = billId;
        this.billUrl = billUrl;
        this.currCommittee = currCommittee;
    }
}
