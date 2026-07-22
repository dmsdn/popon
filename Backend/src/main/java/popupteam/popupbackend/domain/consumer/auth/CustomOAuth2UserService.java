package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.Customer.Provider;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import java.util.Map;
import lombok.Generated;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
   private final CustomerAccountRepository customerRepository;

   public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
      System.out.println("===== loadUser 호출됨 =====");
      OAuth2User oAuth2User = super.loadUser(userRequest);
      
      System.out.println("카카오 유저 정보: " + String.valueOf(oAuth2User.getAttributes()));
      String registrationId = userRequest.getClientRegistration().getRegistrationId();
      Map<String, Object> attributes = oAuth2User.getAttributes();
      String email = null;
      String nickname = "사용자";
      String profileImage = null;
      String providerId;
      if ("kakao".equals(registrationId)) {
         providerId = String.valueOf(attributes.get("id"));
         Map<String, Object> kakaoAccount = (Map)attributes.get("kakao_account");
         if (kakaoAccount != null) {
            Map<String, Object> profile = (Map)kakaoAccount.get("profile");
            if (profile != null) {
               nickname = (String)profile.get("nickname");
               profileImage = (String)profile.get("profile_image_url");
            }
         }
      } else {
         if (!"google".equals(registrationId)) {
            throw new OAuth2AuthenticationException("지원하지 않는 로그인 방식이에요.");
         }

         providerId = String.valueOf(attributes.get("sub"));
         email = (String)attributes.get("email");
         nickname = (String)attributes.get("name");
         profileImage = (String)attributes.get("picture");
      }

      

      System.out.println("providerId: " + providerId + ", nickname: " + nickname);
      Customer.Provider provider = Provider.valueOf(registrationId.toUpperCase());
      final String finalProviderId = providerId;
      final String finalEmail = email;
      final String finalNickname = nickname;
      final String finalProfileImage = profileImage;

      Customer customer = customerRepository.findByProviderAndProviderId(provider, providerId)
        .map(existing -> {
            if (existing.getWithdrawn()) {
                // 탈퇴했던 계정이면 부활시키기
                existing.setWithdrawn(false);
                existing.setWithdrawnAt(null);
                existing.setNickname(finalNickname);
                existing.setEmail(finalEmail);
                existing.setProfileImage(finalProfileImage);
                return customerRepository.save(existing);
            }
            return existing;
        })
        .orElseGet(() -> {
            System.out.println("기존 유저 없음, 새로 생성 시도");
            Customer newCustomer = new Customer();
            newCustomer.setProvider(provider);
            newCustomer.setProviderId(finalProviderId);
            newCustomer.setEmail(finalEmail);
            newCustomer.setNickname(finalNickname);
            newCustomer.setProfileImage(finalProfileImage);
            Customer saved = customerRepository.save(newCustomer);
            System.out.println("저장 완료, id: " + saved.getId());
            return saved;
        });
      System.out.println("최종 customer id: " + customer.getId());

      if (customer.getWithdrawn()) {
      throw new OAuth2AuthenticationException("탈퇴한 계정이에요. 재가입이 필요해요.");
}
      return oAuth2User;
   }

   @Generated
   public CustomOAuth2UserService(final CustomerAccountRepository customerRepository) {
      this.customerRepository = customerRepository;
   }
}