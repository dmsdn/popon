package popupteam.popupbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import popupteam.popupbackend.config.FqnBeanNameGenerator;

/**
 * [통합 셸 — 방식 2: 도메인 패키지 통합]
 * 소비자 도메인이 domain/consumer·review·wishlist 로 편입되어 단일 루트가 되었다.
 */
@SpringBootApplication(nameGenerator = FqnBeanNameGenerator.class)
@EnableScheduling
public class UnifiedApplication {
    public static void main(String[] args) {
        SpringApplication.run(UnifiedApplication.class, args);
    }
}
