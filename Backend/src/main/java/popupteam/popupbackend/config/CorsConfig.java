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
        // 7/31 배포 도메인 추가 — 프론트 3종을 EC2(3.35.16.87)에 올리고 nginx + HTTPS를 붙였다.
        //
        // 브라우저는 **같은 출처로 보내는 POST·PUT·PATCH·DELETE에도 Origin 헤더를 붙인다.**
        // 프론트가 /api를 상대경로로 부르므로 브라우저 입장에서는 같은 출처인데, nginx가 그 Origin을
        // 그대로 백엔드에 넘기고 스프링 CORS 필터가 "모르는 출처"라며 막는다.
        // 그래서 **GET(목록·상세)은 멀쩡한데 로그인·등록만 「Invalid CORS request」로 죽는** 형태가 된다.
        // 배포 직후 관리자 로그인이 안 되던 원인이 이것이었고, 7/24에 5174·5175가 빠져 있어
        // 같은 증상을 한 번 겪었다. **프론트 출처가 늘면 여기부터 확인할 것.**
        //
        // http/https를 둘 다 넣는 이유: nginx가 http를 https로 301 리다이렉트하지만,
        // 리다이렉트 전에 날아간 요청이나 사설망 경유 호출이 http Origin을 달고 올 수 있다.
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",   // 소비자 (customerfrontend)
                "http://localhost:5174",   // 주최자 (popupfrontend)
                "http://localhost:5175",   // 관리자 (adminfrontend)
                "http://localhost:5176",   // 현장 웨이팅
                // ── 배포 (EC2 3.35.16.87 · nip.io + Let's Encrypt) ──
                "https://3.35.16.87.nip.io",          // 소비자
                "https://seller.3.35.16.87.nip.io",   // 주최자
                "https://admin.3.35.16.87.nip.io",    // 관리자
                "http://3.35.16.87.nip.io",
                "http://seller.3.35.16.87.nip.io",
                "http://admin.3.35.16.87.nip.io"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // 쿠키(JSESSIONID)나 Authorization 헤더 주고받으려면 필수

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}