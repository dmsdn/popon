package popupteam.popupbackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import popupteam.popupbackend.security.JwtAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> {}) // CorsConfig의 CorsConfigurationSource Bean을 자동으로 사용
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/business/auth/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/my").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/contract").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/slots").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reservations/popup/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/cancel").authenticated()
                        .requestMatchers("/api/reservations/**").permitAll()
                        .requestMatchers("/api/admin/auth/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/cancel").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reservations/checkin/qr").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/checkin").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/no-show").authenticated()
                        .requestMatchers("/api/reservations/**").permitAll()
                        .requestMatchers("/api/cs/**").permitAll()   // 참가자용, 팀 예약 API와 동일한 정책
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reports").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/visits/log").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/venues/**").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/terms").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/popups/*/waiting").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/waiting/board").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/waiting/*").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/queue/board").permitAll()   // === 추가 ===
                        .requestMatchers("/error").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/live-status").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/keywords").permitAll()   // === 추가: 관심 카테고리 목록 조회 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/regions").permitAll()   // === 추가: 관심 지역 목록 조회 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/announcements").permitAll()   // === 추가: 공지사항 조회, 비로그인 403 수정 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/banners").permitAll()   // === 추가: 배너 조회, 비로그인 403 수정 ===
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}