package com.assembly.application.asset;

import com.assembly.application.asset.port.in.GetAssetUseCase;
import com.assembly.application.asset.port.out.AssetPort;
import com.assembly.domain.asset.Asset;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetQueryService implements GetAssetUseCase {

    private final AssetPort assetPort;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<AssetResult> getLatestAsset(String monaCd) {
        List<Asset> assets = assetPort.findByMonaCdOrderByDeclareYearDesc(monaCd);
        if (assets.isEmpty()) return Optional.empty();
        return Optional.of(toResult(assets.get(0)));
    }

    @Override
    public List<AssetResult> getAllAssets(String monaCd) {
        return assetPort.findByMonaCdOrderByDeclareYearDesc(monaCd)
                .stream()
                .map(this::toResult)
                .toList();
    }

    private AssetResult toResult(Asset asset) {
        List<AssetResult.CategoryResult> categories = parseCategories(asset);

        // 순자산 = 총합계 (채무 포함 이미 반영된 값 사용)
        long totalManwon = asset.getTotalAmount() != null
                ? asset.getTotalAmount().longValue() : 0L;

        // 퍼센티지는 채무 제외 총액 기준
        long grossManwon = categories.stream()
                .filter(c -> !c.name().contains("채무"))
                .mapToLong(AssetResult.CategoryResult::amountManwon)
                .sum();

        List<AssetResult.CategoryResult> withPct = categories.stream()
                .map(c -> new AssetResult.CategoryResult(
                        c.name(),
                        c.count(),
                        c.amountManwon(),
                        grossManwon > 0 && !c.name().contains("채무")
                                ? Math.round(c.amountManwon() * 1000.0 / grossManwon) / 10.0
                                : 0.0,
                        c.items()
                ))
                .toList();

        return new AssetResult(asset.getDeclareYear(), totalManwon, withPct);
    }

    private List<AssetResult.CategoryResult> parseCategories(Asset asset) {
        if (asset.getRawData() == null || asset.getRawData().isBlank()) {
            return Collections.emptyList();
        }
        try {
            ObjectNode raw = objectMapper.readValue(asset.getRawData(), ObjectNode.class);
            ArrayNode cats = (ArrayNode) raw.get("categories");
            if (cats == null) return Collections.emptyList();

            return objectMapper.readerForListOf(ObjectNode.class)
                    .<List<ObjectNode>>readValue(cats)
                    .stream()
                    .map(c -> {
                        String name = c.get("name").asText();
                        int count = c.get("count").asInt();
                        long cheonwon = c.get("amountCheonwon").asLong();
                        long manwon = cheonwon / 10;

                        List<AssetResult.ItemResult> items = Collections.emptyList();
                        ArrayNode itemsNode = (ArrayNode) c.get("items");
                        if (itemsNode != null) {
                            try {
                                items = objectMapper.readerForListOf(ObjectNode.class)
                                        .<List<ObjectNode>>readValue(itemsNode)
                                        .stream()
                                        .map(it -> new AssetResult.ItemResult(
                                                it.get("relation").asText(),
                                                it.get("desc").asText(),
                                                it.get("amountCheonwon").asLong() / 10
                                        ))
                                        .toList();
                            } catch (Exception ignored) {}
                        }

                        return new AssetResult.CategoryResult(name, count, manwon, 0.0, items);
                    }).toList();
        } catch (Exception e) {
            log.warn("rawData 파싱 실패: monaCd={}, 오류={}", asset.getMonaCd(), e.getMessage());
            return Collections.emptyList();
        }
    }
}
