package popupteam.popupbackend.common.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class SmsNotificationService {

    @Value("${notification.sms.naver.service-id:}")
    private String serviceId;

    @Value("${notification.sms.naver.access-key:}")
    private String accessKey;

    @Value("${notification.sms.naver.secret-key:}")
    private String secretKey;

    @Value("${notification.sms.naver.sender-phone:}")
    private String senderPhone;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendQrCode(String phoneNumber, String content) {
        if (phoneNumber == null || phoneNumber.isBlank()) return;

        if (accessKey == null || accessKey.isBlank() || serviceId == null || serviceId.isBlank()) {
            log.info("[문자 발송 스킵 - 네이버 SENS 키 미설정] phone={}, content={}", phoneNumber, content);
            return;
        }

        try {
            long timestamp = System.currentTimeMillis();
            String method = "POST";
            String url = "/sms/v2/services/" + serviceId + "/messages";
            String signature = makeSignature(method, url, timestamp);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-ncp-apigw-timestamp", String.valueOf(timestamp));
            headers.set("x-ncp-iam-access-key", accessKey);
            headers.set("x-ncp-apigw-signature-v2", signature);

            Map<String, Object> message = new HashMap<>();
            message.put("to", phoneNumber.replaceAll("-", ""));
            message.put("content", content);

            Map<String, Object> body = new HashMap<>();
            body.put("type", "SMS");
            body.put("from", senderPhone);
            body.put("content", content);
            body.put("messages", new Object[]{message});

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity("https://sens.apigw.ntruss.com" + url, request, String.class);

            log.info("[문자 발송 성공] phone={}", phoneNumber);
        } catch (Exception e) {
            log.error("[문자 발송 실패] phone={}, error={}", phoneNumber, e.getMessage());
        }
    }

    private String makeSignature(String method, String url, long timestamp) throws Exception {
        String message = method + " " + url + "\n" + timestamp + "\n" + accessKey;
        SecretKeySpec signingKey = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(signingKey);
        byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(rawHmac);
    }
}