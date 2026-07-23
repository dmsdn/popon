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

      // 1) socialId(불변) 기준으로 활성 계정 매칭
      Customer customer = customerRepository.findByProviderAndSocialIdAndWithdrawnFalse(provider, finalProviderId)
        // 2) socialId 컬럼 도입 전 가입자를 위한 레거시 호환 매칭 (providerId 기준)
        .or(() -> customerRepository.findByProviderAndProviderIdAndWithdrawnFalse(provider, finalProviderId)
            .map(legacy -> {
                if (legacy.getSocialId() == null) {
                    legacy.setSocialId(finalProviderId); // 다음부터는 socialId로 매칭되도록 백필
                    return customerRepository.save(legacy);
                }
                return legacy;
            }))
        .orElseGet(() -> {
            // 활성 계정이 없음 = 신규 가입이거나, 탈퇴 후 재가입.
            // 탈퇴 정보는 손대지 않고 이 소셜 계정으로 몇 번째 가입인지만 세서 새 계정을 만든다.
            long joinCount = customerRepository.countByProviderAndSocialId(provider, finalProviderId);
            String displayProviderId = (joinCount == 0) ? finalProviderId : (finalProviderId + "_" + (joinCount + 1));

            System.out.println("활성 계정 없음, 새로 생성 (가입 회차: " + (joinCount + 1) + ")");
            Customer newCustomer = new Customer();
            newCustomer.setProvider(provider);
            newCustomer.setSocialId(finalProviderId);
            newCustomer.setProviderId(displayProviderId);
            newCustomer.setEmail(finalEmail);
            newCustomer.setNickname(finalNickname);
            newCustomer.setProfileImage(finalProfileImage);
            Customer saved = customerRepository.save(newCustomer);
            System.out.println("저장 완료, id: " + saved.getId() + ", providerId: " + saved.getProviderId());
            return saved;
        });
      System.out.println("최종 customer id: " + customer.getId());

      return oAuth2User;
   }

   @Generated
   public CustomOAuth2UserService(final CustomerAccountRepository customerRepository) {
      this.customerRepository = customerRepository;
   }
}