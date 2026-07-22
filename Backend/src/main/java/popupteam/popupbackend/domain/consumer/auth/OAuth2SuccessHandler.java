package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.Customer.Provider;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.Generated;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
   private final CustomerAccountRepository customerRepository;
   private final JwtUtil jwtUtil;

   public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
      OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken)authentication;
      OAuth2User oAuth2User = oauthToken.getPrincipal();
      String registrationId = oauthToken.getAuthorizedClientRegistrationId();
      Map<String, Object> attributes = oAuth2User.getAttributes();
      String providerId;
      if ("kakao".equals(registrationId)) {
         providerId = String.valueOf(attributes.get("id"));
      } else {
         if (!"google".equals(registrationId)) {
            throw new RuntimeException("지원하지 않는 로그인 방식이에요.");
         }

         providerId = String.valueOf(attributes.get("sub"));
      }

      Customer.Provider provider = Provider.valueOf(registrationId.toUpperCase());
      Customer customer = (Customer)this.customerRepository.findByProviderAndProviderId(provider, providerId).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없어요."));
      String token = this.jwtUtil.generateToken(customer.getId(), customer.getNickname(), customer.getProvider().name());
      String redirectUrl = "http://localhost:5173/login/success?token=" + token;
      response.sendRedirect(redirectUrl);
   }

   @Generated
   public OAuth2SuccessHandler(final CustomerAccountRepository customerRepository, final JwtUtil jwtUtil) {
      this.customerRepository = customerRepository;
      this.jwtUtil = jwtUtil;
   }
}
