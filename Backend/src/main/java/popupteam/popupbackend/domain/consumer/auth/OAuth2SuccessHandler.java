package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.Customer.Provider;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * 소셜 로그인 성공 후 실제로 처리하는 곳.
 * - 이미 가입된(활성) 유저 -> 바로 진짜 로그인 토큰 발급, DB는 안 건드림
 * - 신규(또는 탈퇴 후 재가입) 유저 -> DB에 아직 아무것도 안 만들고, "가입대기 토큰"만 발급해서
 *   회원정보 입력(전화번호/약관동의) 화면으로 보냄. 진짜 Customer row는 그 화면 제출 시점에 생김.
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    private static final String FRONTEND_BASE_URL = "http://localhost:5173";

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oauthToken.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String socialId;
        String email = null;
        String nickname = "사용자";
        String profileImage = null;

        if ("kakao".equals(registrationId)) {
            socialId = String.valueOf(attributes.get("id"));
            Object kakaoAccountObj = attributes.get("kakao_account");
            if (kakaoAccountObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> kakaoAccount = (Map<String, Object>) kakaoAccountObj;
                Object profileObj = kakaoAccount.get("profile");
                if (profileObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> profile = (Map<String, Object>) profileObj;
                    nickname = (String) profile.get("nickname");
                    profileImage = (String) profile.get("profile_image_url");
                }
            }
        } else if ("google".equals(registrationId)) {
            socialId = String.valueOf(attributes.get("sub"));
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            profileImage = (String) attributes.get("picture");
        } else {
            throw new RuntimeException("지원하지 않는 로그인 방식이에요.");
        }

        Provider provider = Provider.valueOf(registrationId.toUpperCase());

        // 1) socialId(불변) 기준으로 활성 계정 매칭
        // 2) socialId 컬럼 도입 전 가입자를 위한 레거시 호환 매칭 (providerId 기준)
        var existing = customerRepository.findByProviderAndSocialIdAndWithdrawnFalse(provider, socialId)
                .or(() -> customerRepository.findByProviderAndProviderIdAndWithdrawnFalse(provider, socialId)
                        .map(legacy -> {
                            if (legacy.getSocialId() == null) {
                                legacy.setSocialId(socialId); // 다음부터는 socialId로 매칭되도록 백필
                                return customerRepository.save(legacy);
                            }
                            return legacy;
                        }));

        if (existing.isPresent()) {
            // 이미 가입 완료된 활성 계정 -> 바로 로그인. DB 안 건드림.
            Customer customer = existing.get();
            String token = jwtUtil.generateToken(customer.getId(), customer.getNickname(), customer.getProvider().name());
            response.sendRedirect(FRONTEND_BASE_URL + "/login/success?token=" + token);
            return;
        }

        // 활성 계정 없음 = 신규 가입이거나 탈퇴 후 재가입.
        // DB에 아직 아무것도 안 만들고, 가입대기 토큰만 발급해서 회원정보 입력 화면으로 보냄.
        String pendingToken = jwtUtil.generatePendingSignupToken(
                provider.name(), socialId, nickname, email, profileImage);
        response.sendRedirect(FRONTEND_BASE_URL + "/signup/info?pendingToken=" + pendingToken);
    }
}