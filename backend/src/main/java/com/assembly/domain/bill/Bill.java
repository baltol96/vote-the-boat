package com.assembly.domain.bill;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills", indexes = {
        @Index(name = "idx_bill_bill_no", columnList = "billNo", unique = true),
        @Index(name = "idx_bill_mona_cd", columnList = "monaCd"),
        @Index(name = "idx_bill_propose_dt", columnList = "proposeDt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String billNo; // 법안 번호

    @Column(length = 50)
    private String billId; // API 의안ID (BILL_ID)

    @Column(nullable = false, length = 200)
    private String billName; // 법안명

    @Column(nullable = false, length = 20)
    private String monaCd; // 대표발의 의원 MONA_CD

    @Column(length = 50)
    private String proposerName; // 대표발의 의원명

    private LocalDate proposeDt; // 발의일

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BillStatus status = BillStatus.PROPOSED;

    private LocalDate passDt; // 통과일 (PROC_DT 의결일)

    @Column(columnDefinition = "TEXT")
    private String summary; // 법안 요약

    @Column(length = 100)
    private String committee; // 소관위원회

    @Column(length = 100)
    private String procResult; // 본회의심의결과 (원문)

    @Column(length = 5)
    private String age; // 대수

    @Column(length = 500)
    private String detailLink; // 상세페이지 URL

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Builder
    public Bill(String billNo, String billId, String billName, String monaCd, String proposerName,
                LocalDate proposeDt, BillStatus status, LocalDate passDt,
                String summary, String committee, String procResult, String age, String detailLink) {
        this.billNo = billNo;
        this.billId = billId;
        this.billName = billName;
        this.monaCd = monaCd;
        this.proposerName = proposerName;
        this.proposeDt = proposeDt;
        this.status = status != null ? status : BillStatus.PROPOSED;
        this.passDt = passDt;
        this.summary = summary;
        this.committee = committee;
        this.procResult = procResult;
        this.age = age;
        this.detailLink = detailLink;
    }

    public void update(String billName, String committee, BillStatus status,
                       LocalDate passDt, String procResult, String detailLink) {
        this.billName = billName;
        this.committee = committee;
        this.status = status;
        this.passDt = passDt;
        this.procResult = procResult;
        this.detailLink = detailLink;
    }
}
