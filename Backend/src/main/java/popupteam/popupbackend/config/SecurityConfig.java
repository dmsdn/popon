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
                        // === 순서 중요: 구체적인 규칙(checkin/no-show/qr)이 아래의 넓은 permitAll보다 반드시 먼저 와야 함 ===
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reservations/checkin/qr").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/checkin").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/no-show").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reservations/*/cancel").permitAll()   // 소비자 본인취소는 컨트롤러 안에서 customerId로 권한 체크함
                        .requestMatchers("/api/reservations/**").permitAll()
                        .requestMatchers("/api/admin/auth/**").permitAll()
                        .requestMatchers("/api/cs/**").permitAll()   // 참가자용, 팀 예약 API와 동일한 정책
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reports").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/visits/log").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/venues/**").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/terms").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/popups/*/waiting").permitAll()   // === 추가 ===
                        // 손님이 문자로 받은 /qr/{token} 화면이 자기 대기 상태를 확인한다 (7/31).
                        // 비회원 웨이팅도 써야 해서 인증을 안 건다. 대신 응답에 개인정보를 담지 않는다
                        // (WaitingQrStatusResponse — 이름·연락처·이메일 제외, 상태와 순번만).
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/waiting/qr/*").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/waiting/board").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/waiting/*").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/waiting/*/cancel").permitAll()   // === 추가: 소비자 본인취소는 컨트롤러 안에서 customerId로 권한 체크함 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/queue/board").permitAll()   // === 추가 ===
                        .requestMatchers("/error").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/popups/*/live-status").permitAll()   // === 추가 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/keywords").permitAll()   // === 추가: 관심 카테고리 목록 조회 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/regions").permitAll()   // === 추가: 관심 지역 목록 조회 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/geocode").permitAll()   // === 추가: 팝업 등록폼 지도 미리보기용 주소->좌표 변환 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/announcements").permitAll()   // === 추가: 공지사항 조회, 비로그인 403 수정 ===
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/banners").permitAll()   // === 추가: 배너 조회, 비로그인 403 수정 ===
                        .requestMatchers("/api/notices/my/**").permitAll()   // === 추가: 소비자 알림함, 소유권 확인은 서비스 로직에서 처리 ===
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/popups/*/click").permitAll()   // === 추가: 비회원도 인기순위 집계용 클릭 로그 남겨야 함 ===
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}