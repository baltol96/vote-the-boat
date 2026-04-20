package com.assembly.application.asset.port.in;

import com.assembly.application.asset.AssetResult;

import java.util.List;
import java.util.Optional;

public interface GetAssetUseCase {
    Optional<AssetResult> getLatestAsset(String monaCd);
    List<AssetResult> getAllAssets(String monaCd);
}
