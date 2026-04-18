package com.assembly.domain.billkeyword;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bill_keywords", indexes = {
        @Index(name = "idx_bill_keywords_bill_no", columnList = "billNo", unique = true),
        @Index(name = "idx_bill_keywords_category", columnList = "category")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String billNo;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BillCategory category;

    @Column(columnDefinition = "jsonb")
    private String keywords; // JSON array of strings

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private BillKeywordStatus status;

    @Column(length = 64)
    private String sourceHash;

    private LocalDateTime generatedAt;

    @Builder
    public BillKeyword(String billNo, BillCategory category, String keywords,
                       String summary, BillKeywordStatus status, String sourceHash) {
        this.billNo = billNo;
        this.category = category;
        this.keywords = keywords;
        this.summary = summary;
        this.status = status != null ? status : BillKeywordStatus.SUCCESS;
        this.sourceHash = sourceHash;
        this.generatedAt = LocalDateTime.now();
    }
}
