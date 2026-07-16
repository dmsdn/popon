package com.popupplatform.backend.service;

import com.popupplatform.backend.entity.Customer;
import com.popupplatform.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final CustomerRepository customerRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        System.out.println("===== loadUser 호출됨 =====");

        OAuth2User oAuth2User = super.loadUser(userRequest);
        System.out.println("카카오 유저 정보: " + oAuth2User.getAttributes());

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String providerId;
        String email = null;
        String nickname = "사용자";
        String profileImage = null;

        if ("kakao".equals(registrationId)) {
            providerId = String.valueOf(attributes.get("id"));

            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                    profileImage = (String) profile.get("profile_image_url");
                }
            }
        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 로그인 방식이에요.");
        }

        System.out.println("providerId: " + providerId + ", nickname: " + nickname);

        Customer.Provider provider = Customer.Provider.valueOf(registrationId.toUpperCase());

        final String finalProviderId = providerId;
        final String finalEmail = email;
        final String finalNickname = nickname;
        final String finalProfileImage = profileImage;

        Customer customer = customerRepository.findByProviderAndProviderId(provider, providerId)
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

        return oAuth2User;
    }
}