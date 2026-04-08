package com.assembly.application.asset.port.out;

import com.assembly.domain.asset.Asset;

import java.util.List;
import java.util.Optional;

public interface AssetPort {
    List<Asset> findByMonaCdOrderByDeclareYearDesc(String monaCd);
    Optional<Asset> findByMonaCdAndDeclareYear(String monaCd, Integer declareYear);
    boolean existsByMonaCdAndDeclareYear(String monaCd, Integer declareYear);
    Asset save(Asset asset);
}
