package popupteam.popupbackend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import popupteam.popupbackend.domain.consumer.auth.CustomerAuthCheckFilter;
import popupteam.popupbackend.security.JwtAuthenticationFilter;

/**
 * [버그 수정] "로그인 후 팝업 목록 500 에러"의 진짜 원인.
 *
 * CustomerAuthCheckFilter, JwtAuthenticationFilter는 각자의 SecurityConfig에서
 * http.addFilterBefore(...)로 Spring Security 필터체인 안에 명시적으로 등록돼 있다
 * (CustomerAuthCheckFilter는 consumerFilterChain의 securityMatcher("/oauth2/**","/login/**","/api/customer/**")
 *  범위 안에서만 동작해야 정상).
 *
 * 그런데 두 필터 클래스 모두 @Component가 붙어 있다. 스프링 부트는 컨텍스트에 있는
 * jakarta.servlet.Filter 타입 빈을 (이미 FilterRegistrationBean으로 감싸둔 게 아니면) 자동으로
 * 서블릿 컨테이너 레벨 필터로도 등록해버린다(ServletContextInitializerBeans) - 기본 urlPatterns가
 * "/*"라서 Security의 securityMatcher 범위와 무관하게 "모든 요청"에 대해 한 번 더 실행된다.
 *
 * 그 결과 CustomerAuthCheckFilter가 /api/business/auth/login, /api/popups/my 같은 business API
 * 요청에도 (Security 체인을 다 통과한 뒤, DispatcherServlet 바로 앞에서) 추가로 실행됐고,
 * business 로그인 토큰에는 "id" 클레임이 없어서 JwtUtil.getCustomerIdFromToken()에서
 * NullPointerException이 터지며 500을 던졌다. (JwtUtil 쪽도 방어 코드를 추가했지만,
 * 애초에 이 필터가 business 요청까지 타면 안 되므로 등록 자체를 막는 게 근본 수정이다.)
 *
 * 아래처럼 FilterRegistrationBean으로 감싸고 setEnabled(false)를 주면, "서블릿 컨테이너 자동 등록"만
 * 꺼지고 Security 필터체인 안의 addFilterBefore() 등록은 그대로 유지된다 - 각 필터는 이제 원래
 * 의도한 범위(Security 체인의 securityMatcher)에서만 정확히 한 번씩 실행된다.
 */
@Configuration
public class FilterRegistrationConfig {

    @Bean
    public FilterRegistrationBean<CustomerAuthCheckFilter> customerAuthCheckFilterRegistration(
            CustomerAuthCheckFilter filter) {
        FilterRegistrationBean<CustomerAuthCheckFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtAuthenticationFilterRegistration(
            JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
