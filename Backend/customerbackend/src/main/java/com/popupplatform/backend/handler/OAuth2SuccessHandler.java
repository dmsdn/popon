package com.popupplatform.backend.handler;

import com.popupplatform.backend.entity.Customer;
import com.popupplatform.backend.repository.CustomerRepository;
import com.popupplatform.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                          Authentication authentication) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oauthToken.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String providerId = String.valueOf(attributes.get("id"));
        Customer.Provider provider = Customer.Provider.valueOf(registrationId.toUpperCase());

        Customer customer = customerRepository.findByProviderAndProviderId(provider, providerId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없어요."));

        String token = jwtUtil.generateToken(customer.getId(), customer.getNickname());

        String redirectUrl = "http://localhost:5173/login/success?token=" + token;
        response.sendRedirect(redirectUrl);
    }
}