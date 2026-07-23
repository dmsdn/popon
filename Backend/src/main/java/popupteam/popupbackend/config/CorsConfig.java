package popupteam.popupbackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * 전역 CORS 설정.
 * SecurityFilterChain 두 개(관리자/주최자용, 소비자용) 모두 이 Bean을 자동으로 가져다 쓴다.
 * 각 SecurityConfig에서 .cors(Customizer.withDefaults())를 호출해야 실제로 적용됨.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 프론트 개발 서버 (Vite). 배포 도메인 생기면 여기에 추가하면 됨.
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // 쿠키(JSESSIONID)나 Authorization 헤더 주고받으려면 필수

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}