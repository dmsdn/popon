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

        // 프론트 개발 서버 3종 — 소비자(5173)·주최자(5174)·관리자(5175).
        // ※ 각 프론트는 상대경로 /api를 dev 프록시(Vite/Next)로 8080에 전달하는데,
        //   프록시가 브라우저의 Origin 헤더(예: http://localhost:5175)를 그대로 넘긴다.
        //   여기에 등록되지 않은 Origin은 스프링 CORS 필터가 403으로 막으므로(로그인 POST 포함),
        //   프론트를 새 포트로 추가·분리하면 반드시 이 목록에도 추가해야 한다.
        // 배포 도메인이 생기면 그 도메인도 여기에 추가하면 됨.
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",   // 소비자 (customerfrontend)
                "http://localhost:5174",   // 주최자 (popupfrontend)
                "http://localhost:5175"    // 관리자 (adminfrontend)
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // 쿠키(JSESSIONID)나 Authorization 헤더 주고받으려면 필수

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}