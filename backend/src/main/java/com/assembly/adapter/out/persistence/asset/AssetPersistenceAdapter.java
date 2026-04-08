package com.assembly.adapter.out.persistence.asset;

import com.assembly.application.asset.port.out.AssetPort;
import com.assembly.domain.asset.Asset;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AssetPersistenceAdapter implements AssetPort {

    private final AssetJpaRepository assetJpaRepository;

    @Override
    public List<Asset> findByMonaCdOrderByDeclareYearDesc(String monaCd) {
        return assetJpaRepository.findByMonaCdOrderByDeclareYearDesc(monaCd);
    }

    @Override
    public Optional<Asset> findByMonaCdAndDeclareYear(String monaCd, Integer declareYear) {
        return assetJpaRepository.findByMonaCdAndDeclareYear(monaCd, declareYear);
    }

    @Override
    public boolean existsByMonaCdAndDeclareYear(String monaCd, Integer declareYear) {
        return assetJpaRepository.existsByMonaCdAndDeclareYear(monaCd, declareYear);
    }

    @Override
    public Asset save(Asset asset) {
        return assetJpaRepository.save(asset);
    }
}
