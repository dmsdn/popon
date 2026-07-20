package com.popupplatform.backend.config;

import com.popupplatform.backend.handler.OAuth2SuccessHandler;
import com.popupplatform.backend.service.CustomOAuth2UserService;
import lombok.Generated;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
   private final CustomOAuth2UserService customOAuth2UserService;
   private final OAuth2SuccessHandler oAuth2SuccessHandler;

   @Bean
   public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
      http.csrf((csrf) -> csrf.disable()).authorizeHttpRequests((auth) -> ((AuthorizeHttpRequestsConfigurer.AuthorizedUrl)((AuthorizeHttpRequestsConfigurer.AuthorizedUrl)auth.requestMatchers(new String[]{"/", "/auth/**", "/login/**", "/api/**"})).permitAll().anyRequest()).authenticated()).oauth2Login((oauth2) -> oauth2.userInfoEndpoint((userInfo) -> userInfo.userService(this.customOAuth2UserService)).successHandler(this.oAuth2SuccessHandler));
      return (SecurityFilterChain)http.build();
   }

   @Generated
   public SecurityConfig(final CustomOAuth2UserService customOAuth2UserService, final OAuth2SuccessHandler oAuth2SuccessHandler) {
      this.customOAuth2UserService = customOAuth2UserService;
      this.oAuth2SuccessHandler = oAuth2SuccessHandler;
   }
}
