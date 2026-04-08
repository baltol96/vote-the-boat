package com.assembly.domain.bill;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bill_proposers", indexes = {
        @Index(name = "idx_bill_proposer_bill_no", columnList = "billNo"),
        @Index(name = "idx_bill_proposer_mona_cd", columnList = "monaCd"),
        @Index(name = "idx_bill_proposer_mona_cd_role", columnList = "monaCd, role")
}, uniqueConstraints = @UniqueConstraint(
        name = "uk_bill_proposer",
        columnNames = {"billNo", "monaCd"}
))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillProposer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String billNo;

    @Column(nullable = false, length = 20)
    private String monaCd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ProposerRole role;

    @Column(length = 100)
    private String proposerName;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Builder
    public BillProposer(String billNo, String monaCd, ProposerRole role, String proposerName) {
        this.billNo = billNo;
        this.monaCd = monaCd;
        this.role = role;
        this.proposerName = proposerName;
    }
}
