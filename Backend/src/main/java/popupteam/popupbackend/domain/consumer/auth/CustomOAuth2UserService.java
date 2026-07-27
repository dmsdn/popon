package popupteam.popupbackend.domain.consumer.auth;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/**
 * [정책 변경] 여기서는 더 이상 DB에 손대지 않는다.
 * 신규 가입 여부 판단 + Customer row 생성/조회는 전부 OAuth2SuccessHandler로 일원화했음
 * (예전엔 여기랑 SuccessHandler 두 군데서 각자 따로 조회해서 서로 다른 로직을 타는 버그가 있었음).
 * 이 클래스는 순수하게 "카카오/구글이 로그인 성공시켰다"는 것만 스프링 시큐리티에 전달하는 역할만 함.
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        return super.loadUser(userRequest);
    }
}