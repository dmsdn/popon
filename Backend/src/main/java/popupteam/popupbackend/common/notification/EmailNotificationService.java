package popupteam.popupbackend.common.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public void sendQrCode(String toEmail, String title, String content) {
        if (toEmail == null || toEmail.isBlank()) return;

        if (fromAddress == null || fromAddress.isBlank()) {
            log.info("[이메일 발송 스킵 - 발신계정 미설정] to={}, title={}", toEmail, title);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(title);
            message.setText(content);
            javaMailSender.send(message);
            log.info("[이메일 발송 성공] to={}", toEmail);
        } catch (Exception e) {
            log.error("[이메일 발송 실패] to={}, error={}", toEmail, e.getMessage());
        }
    }
}