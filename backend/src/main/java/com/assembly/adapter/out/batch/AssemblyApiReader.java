package com.assembly.adapter.out.batch;

import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.ItemReader;
import org.springframework.web.client.RestClient;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Slf4j
public class AssemblyApiReader<T extends Map<String, Object>> implements ItemReader<T> {

    private static final int PAGE_SIZE = 100;

    private final RestClient restClient;
    private final String endpoint;
    private final Map<String, String> extraParams;

    private int currentPage = 1;
    private Iterator<T> currentIterator;
    private boolean exhausted = false;

    public AssemblyApiReader(RestClient restClient, String endpoint) {
        this(restClient, endpoint, Map.of());
    }

    public AssemblyApiReader(RestClient restClient, String endpoint, Map<String, String> extraParams) {
        this.restClient = restClient;
        this.endpoint = endpoint;
        this.extraParams = extraParams;
    }

    @Override
    @SuppressWarnings("unchecked")
    public T read() {
        if (exhausted) return null;

        if (currentIterator == null || !currentIterator.hasNext()) {
            List<T> page = fetchPage(currentPage++);
            if (page.isEmpty()) {
                exhausted = true;
                return null;
            }
            currentIterator = page.iterator();
        }

        return currentIterator.hasNext() ? currentIterator.next() : null;
    }

    @SuppressWarnings("unchecked")
    private List<T> fetchPage(int page) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder
                                .path(endpoint)
                                .queryParam("pIndex", page)
                                .queryParam("pSize", PAGE_SIZE);
                        extraParams.forEach(builder::queryParam);
                        return builder.build();
                    })
                    .retrieve()
                    .body(Map.class);

            if (response == null) return List.of();

            List<Map<String, Object>> rows = extractRows(response);
            log.debug("{} page {} → {} rows", endpoint, page, rows.size());
            return (List<T>) rows;
        } catch (Exception e) {
            log.error("{} page {} 조회 실패: {}", endpoint, page, e.getMessage());
            throw e;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractRows(Map<String, Object> response) {
        // 응답 구조: {"API_NAME": [{"head":[...]}, {"row":[...]}]}
        // 외부 리스트를 순회하며 "row" 키를 가진 아이템을 찾아야 함
        for (Object value : response.values()) {
            if (value instanceof List<?> outerList) {
                for (Object item : outerList) {
                    if (item instanceof Map<?, ?> mapItem && mapItem.containsKey("row")) {
                        return (List<Map<String, Object>>) mapItem.get("row");
                    }
                }
            }
        }
        return List.of();
    }
}
