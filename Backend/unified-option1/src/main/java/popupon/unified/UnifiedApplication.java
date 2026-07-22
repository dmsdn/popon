package popupon.unified;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;   // Boot 4: 패키지 이동됨
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * [통합 셸 — 방식 1: 구조 보존 동거]
 * popupbackend(popupteam.popupbackend)와 customerbackend(com.popupplatform.backend)의
 * 패키지 트리를 원형 그대로 한 애플리케이션으로 부팅한다.
 */
@SpringBootApplication(
        scanBasePackages = {"popupteam.popupbackend", "com.popupplatform.backend"},
        nameGenerator = FqnBeanNameGenerator.class)
@EntityScan({"popupteam.popupbackend", "com.popupplatform.backend"})
@EnableJpaRepositories(basePackages = {"popupteam.popupbackend", "com.popupplatform.backend"})
@EnableScheduling
public class UnifiedApplication {
    public static void main(String[] args) {
        SpringApplication.run(UnifiedApplication.class, args);
    }
}
