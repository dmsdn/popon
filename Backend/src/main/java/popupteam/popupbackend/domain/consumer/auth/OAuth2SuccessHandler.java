package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.Customer.Provider;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * 소셜 로그인 성공 후 실제로 처리하는 곳.
 *
 * - 이미 가입된 활성 유저
 *   → 일반 로그인 JWT 발급
 *   → DB 신규 생성 없음
 *
 * - 신규 또는 탈퇴 후 재가입 유저
 *   → DB에 Customer를 아직 생성하지 않음
 *   → 가입대기 토큰만 발급
 *   → 전화번호 및 약관 동의 화면으로 이동
 *   → 최종 제출 시 Customer row 생성
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    // 로그인 성공 후 토큰을 들려 보낼 소비자 웹 주소.
    // localhost 기본값은 "브라우저가 있는 그 기계"로 풀리므로, 각자 자기 PC에서
    // 소비자 dev 서버를 띄우는 지금 팀 구조에서는 누가 로그인해도 동작한다.
    // 소비자 프론트를 서버에 올리는 날에는 app.frontend-base-url만 그 주소로 잡으면 됨 (코드 무수정).
    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String FRONTEND_BASE_URL;

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2AuthenticationToken oauthToken =
                (OAuth2AuthenticationToken) authentication;

        OAuth2User oAuth2User =
                oauthToken.getPrincipal();

        String registrationId =
                oauthToken.getAuthorizedClientRegistrationId();

        Map<String, Object> attributes =
                oAuth2User.getAttributes();

        String socialId;
        String email = null;
        String nickname = "사용자";
        String profileImage = null;

        if ("kakao".equals(registrationId)) {

            socialId =
                    String.valueOf(attributes.get("id"));

            // 카카오는 개발자 콘솔에서 이메일 제공 동의항목을 켤 수 없어서
            // kakao_account.email을 아예 읽지 않음 (요청해도 어차피 안 옴).
            // 이메일은 회원정보 입력 화면(SignupInfoController)에서 사용자가 직접 입력(선택)함.
            Object kakaoAccountObj =
                    attributes.get("kakao_account");

            if (kakaoAccountObj instanceof Map<?, ?> kakaoAccount) {

                Object profileObj =
                        kakaoAccount.get("profile");

                if (profileObj instanceof Map<?, ?> profile) {

                    Object nicknameObj =
                            profile.get("nickname");

                    if (nicknameObj instanceof String kakaoNickname
                            && !kakaoNickname.isBlank()) {
                        nickname = kakaoNickname;
                    }

                    Object profileImageObj =
                            profile.get("profile_image_url");

                    if (profileImageObj instanceof String kakaoProfileImage
                            && !kakaoProfileImage.isBlank()) {
                        profileImage = kakaoProfileImage;
                    }
                }
            }

        } else if ("google".equals(registrationId)) {

            socialId =
                    String.valueOf(attributes.get("sub"));

            Object emailObj =
                    attributes.get("email");

            if (emailObj instanceof String googleEmail) {
                email = googleEmail;
            }

            Object nicknameObj =
                    attributes.get("name");

            if (nicknameObj instanceof String googleNickname
                    && !googleNickname.isBlank()) {
                nickname = googleNickname;
            }

            Object profileImageObj =
                    attributes.get("picture");

            if (profileImageObj instanceof String googleProfileImage
                    && !googleProfileImage.isBlank()) {
                profileImage = googleProfileImage;
            }

        } else {
            throw new IllegalArgumentException(
                    "지원하지 않는 로그인 방식입니다."
            );
        }

        Provider provider =
                Provider.valueOf(
                        registrationId.toUpperCase()
                );

        /*
         * 1. socialId 기준으로 활성 계정 조회
         * 2. socialId 컬럼 도입 전 가입자는 providerId로 추가 조회
         */
        var existing =
                customerRepository
                        .findByProviderAndSocialIdAndWithdrawnFalse(
                                provider,
                                socialId
                        )
                        .or(() ->
                                customerRepository
                                        .findByProviderAndProviderIdAndWithdrawnFalse(
                                                provider,
                                                socialId
                                        )
                                        .map(legacy -> {

                                            if (legacy.getSocialId() == null) {
                                                legacy.setSocialId(socialId);

                                                return customerRepository
                                                        .save(legacy);
                                            }

                                            return legacy;
                                        })
                        );

        /*
         * 이미 가입 완료된 활성 회원
         */
        if (existing.isPresent()) {

            Customer customer =
                    existing.get();

            if (Boolean.TRUE.equals(customer.getSuspended())) {

                String message =
                        URLEncoder.encode(
                                "관리자에 의해 정지된 계정입니다. 관리자에게 문의하세요.",
                                StandardCharsets.UTF_8
                        );

                response.sendRedirect(
                        FRONTEND_BASE_URL
                                + "/login/error?message="
                                + message
                );

                return;
            }

            String token =
                    jwtUtil.generateToken(
                            customer.getId(),
                            customer.getNickname(),
                            customer.getProvider().name()
                    );

            response.sendRedirect(
                    FRONTEND_BASE_URL
                            + "/login/success?token="
                            + URLEncoder.encode(
                                    token,
                                    StandardCharsets.UTF_8
                            )
            );

            return;
        }

        /*
         * 활성 계정 없음
         * 신규 가입 또는 탈퇴 후 재가입
         *
         * 여기서는 DB에 Customer를 저장하지 않는다.
         * 가입대기 토큰만 발급한다.
         */
        String pendingToken =
                jwtUtil.generatePendingSignupToken(
                        provider.name(),
                        socialId,
                        nickname,
                        email,
                        profileImage
                );

        /*
         * 프론트의 실제 회원정보 입력 페이지는 /signup
         */
        response.sendRedirect(
                FRONTEND_BASE_URL
                        + "/signup?pendingToken="
                        + URLEncoder.encode(
                                pendingToken,
                                StandardCharsets.UTF_8
                        )
        );
    }
}