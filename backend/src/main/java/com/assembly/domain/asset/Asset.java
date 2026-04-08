package com.assembly.domain.asset;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets", indexes = {
        @Index(name = "idx_asset_mona_cd", columnList = "monaCd"),
        @Index(name = "idx_asset_declare_year", columnList = "declareYear")
},
        uniqueConstraints = @UniqueConstraint(
                name = "uk_asset_mona_cd_declare_year",
                columnNames = {"monaCd", "declareYear"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String monaCd;

    @Column(nullable = false)
    private Integer declareYear; // 재산신고 연도

    @Column(precision = 15, scale = 0)
    private BigDecimal totalAmount; // 총 재산 (만원)

    @Column(precision = 15, scale = 0)
    private BigDecimal landAmount; // 토지

    @Column(precision = 15, scale = 0)
    private BigDecimal buildingAmount; // 건물

    @Column(precision = 15, scale = 0)
    private BigDecimal depositAmount; // 예금

    @Column(precision = 15, scale = 0)
    private BigDecimal stockAmount; // 주식·채권

    @Column(precision = 15, scale = 0)
    private BigDecimal debtAmount; // 채무

    @Column(columnDefinition = "TEXT")
    private String rawData; // 원본 데이터 JSON

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Builder
    public Asset(String monaCd, Integer declareYear, BigDecimal totalAmount,
                 BigDecimal landAmount, BigDecimal buildingAmount,
                 BigDecimal depositAmount, BigDecimal stockAmount,
                 BigDecimal debtAmount, String rawData) {
        this.monaCd = monaCd;
        this.declareYear = declareYear;
        this.totalAmount = totalAmount;
        this.landAmount = landAmount;
        this.buildingAmount = buildingAmount;
        this.depositAmount = depositAmount;
        this.stockAmount = stockAmount;
        this.debtAmount = debtAmount;
        this.rawData = rawData;
    }
}
