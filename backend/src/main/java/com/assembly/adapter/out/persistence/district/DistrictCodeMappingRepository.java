package com.assembly.adapter.out.persistence.district;

import com.assembly.domain.district.DistrictCodeMapping;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DistrictCodeMappingRepository extends JpaRepository<DistrictCodeMapping, String> {
}
