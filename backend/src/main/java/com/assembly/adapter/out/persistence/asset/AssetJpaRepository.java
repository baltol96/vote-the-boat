package com.assembly.adapter.out.persistence.asset;

import com.assembly.domain.asset.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetJpaRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByMonaCdOrderByDeclareYearDesc(String monaCd);

    Optional<Asset> findByMonaCdAndDeclareYear(String monaCd, Integer declareYear);

    boolean existsByMonaCdAndDeclareYear(String monaCd, Integer declareYear);
}
