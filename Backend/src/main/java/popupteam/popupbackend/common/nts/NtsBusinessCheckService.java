package popupteam.popupbackend.common.nts;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class NtsBusinessCheckService {

    @Value("${nts.api.service-key:}")
    private String serviceKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public enum CheckResult {
        VALID,
        NOT_FOUND,
        CLOSED,
        SKIPPED_NO_KEY,
        ERROR
    }

    @SuppressWarnings("unchecked")
    public CheckResult checkStatus(String businessNumber) {
        if (serviceKey == null || serviceKey.isBlank()) {
            log.info("[사업자상태조회 스킵 - API 키 미설정] businessNumber={}", businessNumber);
            return CheckResult.SKIPPED_NO_KEY;
        }

        String bNo = businessNumber.replace("-", "");

        try {
            // 공공데이터포털 키는 이미 URL 인코딩된 형태라, 디코딩 후 넘겨야
            // UriComponentsBuilder가 인코딩할 때 이중 인코딩되는 걸 방지함
            String decodedKey = URLDecoder.decode(serviceKey, StandardCharsets.UTF_8);

            java.net.URI uri = UriComponentsBuilder
                    .fromUriString("https://api.odcloud.kr/api/nts-businessman/v1/status")
                    .queryParam("serviceKey", decodedKey)
                    .build()
                    .encode(StandardCharsets.UTF_8)
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = Map.of("b_no", List.of(bNo));
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.POST, entity, Map.class);
            Map<String, Object> body = response.getBody();
            log.info("[사업자상태조회 응답] businessNumber={}, body={}", bNo, body);

            List<Map<String, Object>> data = (List<Map<String, Object>>) body.get("data");
            if (data == null || data.isEmpty()) {
                return CheckResult.NOT_FOUND;
            }

            Map<String, Object> first = data.get(0);
            String bSttCd = (String) first.get("b_stt_cd");

            if (bSttCd == null || bSttCd.isBlank()) {
                return CheckResult.NOT_FOUND;
            }
            if ("03".equals(bSttCd)) {
                return CheckResult.CLOSED;
            }
            return CheckResult.VALID;

        } catch (Exception e) {
            log.error("[사업자상태조회 실패] businessNumber={}, error={}", bNo, e.getMessage());
            return CheckResult.ERROR;
        }
    }
}