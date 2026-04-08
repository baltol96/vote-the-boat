package com.assembly.domain.district;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "district_code_mapping")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DistrictCodeMapping {

    @Id
    @Column(length = 10)
    private String sggCode;

    @Column(nullable = false, length = 50)
    private String sggNm; // GeoJSON SIDO_SGG 기준 선거구명 (예: "서울 강서갑")
}
