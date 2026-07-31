package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.auth.OAuth2SuccessHandler;
import popupteam.popupbackend.domain.consumer.auth.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * [통합 수정] 소비자용 체인 — securityMatcher로 담당 구역을 한정해 popupbackend 체인과 공존.
 * 스코프 밖의 모든 경로는 기존 popupbackend SecurityConfig 체인이 그대로 처리한다.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final CustomerAuthCheckFilter customerAuthCheckFilter;

    @Bean
    @Order(1)   // popupbackend의 any-request 체인보다 먼저 평가되어야 함 (@Bean 메서드에 붙여야 적용됨)
    public SecurityFilterChain consumerFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/oauth2/**", "/login/**", "/api/customer/**")
                .cors(cors -> {}) // CorsConfig의 CorsConfigurationSource Bean을 자동으로 사용
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                .addFilterBefore(customerAuthCheckFilter, UsernamePasswordAuthenticationFilter.class)
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                );

        return http.build();
    }
}