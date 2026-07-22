package popupteam.popupbackend.common.geocoding;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class GeocodingService {

    @Value("${naver.maps.client-id:}")
    private String clientId;

    @Value("${naver.maps.client-secret:}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public record Coordinates(double latitude, double longitude) {}

    @SuppressWarnings("unchecked")
    public Optional<Coordinates> geocode(String address) {
        if (address == null || address.isBlank()) return Optional.empty();
        if (clientId == null || clientId.isBlank()) {
            log.info("[지오코딩 스킵 - Naver Maps 키 미설정] address={}", address);
            return Optional.empty();
        }

        try {
            java.net.URI uri = UriComponentsBuilder
                    .fromUriString("https://maps.apigw.ntruss.com/map-geocode/v2/geocode")
                    .queryParam("query", address)
                    .build()
                    .encode(java.nio.charset.StandardCharsets.UTF_8)
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-NCP-APIGW-API-KEY-ID", clientId);
            headers.set("X-NCP-APIGW-API-KEY", clientSecret);

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);

            Map<String, Object> body = response.getBody();
            log.info("[지오코딩 응답 원본] address={}, body={}", address, body);

            List<Map<String, Object>> addresses = (List<Map<String, Object>>) body.get("addresses");

            if (addresses == null || addresses.isEmpty()) {
                log.info("[지오코딩 결과 없음] address={}", address);
                return Optional.empty();
            }

            Map<String, Object> first = addresses.get(0);
            double lng = Double.parseDouble((String) first.get("x"));
            double lat = Double.parseDouble((String) first.get("y"));

            log.info("[지오코딩 성공] address={}, lat={}, lng={}", address, lat, lng);
            return Optional.of(new Coordinates(lat, lng));

        } catch (Exception e) {
            log.error("[지오코딩 실패] address={}, error={}", address, e.getMessage());
            return Optional.empty();
        }
    }
}