package com.assembly.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
public class RestClientConfig {

    @Value("${assembly.api.base-url}")
    private String baseUrl;

    @Value("${assembly.api.key}")
    private String apiKey;

    @Bean
    public RestClient assemblyRestClient() {
        // 이 API는 text/html Content-Type으로 JSON을 반환하므로 커스텀 converter 등록
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                new MediaType("text", "html", StandardCharsets.UTF_8)
        ));

        return RestClient.builder()
                .baseUrl(baseUrl)
                .messageConverters(converters -> {
                    converters.removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
                    converters.add(0, converter);
                })
                .requestInterceptor((request, body, execution) -> {
                    var enrichedUri = UriComponentsBuilder.fromUri(request.getURI())
                            .queryParam("KEY", apiKey)
                            .queryParam("Type", "json")
                            .build(true)
                            .toUri();
                    return execution.execute(new HttpRequest() {
                        @Override public URI getURI()           { return enrichedUri; }
                        @Override public HttpMethod getMethod() { return request.getMethod(); }
                        @Override public HttpHeaders getHeaders() {
                            HttpHeaders h = new HttpHeaders();
                            h.putAll(request.getHeaders());
                            h.set("User-Agent", "Mozilla/5.0 (compatible; VoteTheBoat/1.0)");
                            h.set("Accept", "*/*"); // 이 API는 Accept: application/json 시 HTML 반환
                            return h;
                        }
                    }, body);
                })
                .build();
    }
}
