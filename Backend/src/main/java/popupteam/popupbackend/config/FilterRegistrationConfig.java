package popupteam.popupbackend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import popupteam.popupbackend.domain.consumer.auth.CustomerAuthCheckFilter;
import popupteam.popupbackend.security.JwtAuthenticationFilter;

/**
 * CustomerAuthCheckFilter, JwtAuthenticationFilter는 @Component가 붙어 있어
 * 스프링 부트가 서블릿 컨테이너 레벨 필터로도 자동 등록해버린다(urlPatterns 기본값 "/*").
 * 이로 인해 각 SecurityConfig의 securityMatcher 범위와 무관하게 모든 요청에 중복 실행되는 문제가 있어,
 * FilterRegistrationBean + setEnabled(false)로 컨테이너 자동 등록만 비활성화한다.
 * Security 필터체인 내 addFilterBefore() 등록은 그대로 유지되어, 각 필터는 원래 의도한
 * securityMatcher 범위에서만 실행된다.
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