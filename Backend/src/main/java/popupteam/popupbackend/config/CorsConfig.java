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

        // 허용 Origin 목록 — 로컬 개발 서버 4종 + 배포 도메인(EC2, nip.io + Let's Encrypt).
        // 새 프론트(포트/도메인)가 추가되면 반드시 이 목록에도 등록해야 한다.
        // 등록되지 않은 Origin은 스프링 CORS 필터가 막으며, 특히 로그인 등 POST 요청은
        // GET과 달리 이 검사에 걸리면 바로 실패하므로 누락 시 "목록 조회는 되는데 로그인만 안 되는"
        // 형태로 나타난다.
        //
        // http/https를 모두 등록하는 이유: nginx가 http→https 리다이렉트를 하지만,
        // 리다이렉트 전에 나간 요청이 http Origin을 가진 채로 도달할 수 있기 때문이다.
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",   // 소비자 (customerfrontend)
                "http://localhost:5174",   // 주최자 (popupfrontend)
                "http://localhost:5175",   // 관리자 (adminfrontend)
                "http://localhost:5176",   // 현장 태블릿 웨이팅 등록 (checkinfrontend)
                // ── 배포 (EC2 3.35.16.87 · nip.io + Let's Encrypt) ──
                "https://3.35.16.87.nip.io",          // 소비자
                "https://seller.3.35.16.87.nip.io",   // 주최자
                "https://admin.3.35.16.87.nip.io",    // 관리자
                "https://checkin.3.35.16.87.nip.io",  // 현장 태블릿 웨이팅 등록
                "http://3.35.16.87.nip.io",
                "http://seller.3.35.16.87.nip.io",
                "http://admin.3.35.16.87.nip.io",
                "http://checkin.3.35.16.87.nip.io"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // 쿠키(JSESSIONID)나 Authorization 헤더 주고받으려면 필수

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}