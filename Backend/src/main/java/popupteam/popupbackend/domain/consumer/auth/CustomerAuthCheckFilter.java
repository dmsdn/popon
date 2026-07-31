package popupteam.popupbackend.domain.consumer.auth;

import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * /api/customer/** 요청마다 토큰의 customerId가 지금도 유효한 계정인지(탈퇴/정지 안 됐는지) 확인한다.
 *
 * JWT는 stateless라 만료 전까지는 서명 자체가 계속 유효하기 때문에, "다른 기기에서 탈퇴하면
 * 이 기기도 즉시 로그아웃"을 만들려면 토큰을 무효화하는 게 아니라 매 요청마다 DB의 현재 상태를
 * 확인하는 방식으로 처리한다. (컨트롤러마다 따로 체크하면 새 API 추가할 때 누락되기 쉬우므로
 * 필터 레벨에서 공통으로 막는다.)
 */
@Component
@RequiredArgsConstructor
public class CustomerAuthCheckFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomerAccountRepository customerRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                // 가입대기 토큰(소셜 가입 중, 아직 Customer row가 없는 상태)은 대상 밖 — 그대로 통과
                if (!jwtUtil.isPendingSignupToken(token)) {
                    Long customerId = jwtUtil.getCustomerIdFromToken(token);
                    Customer customer = customerRepository.findById(customerId).orElse(null);

                    if (customer == null || Boolean.TRUE.equals(customer.getWithdrawn())) {
                        writeUnauthorized(response, "탈퇴한 계정입니다. 다시 로그인해주세요.");
                        return;
                    }
                    if (Boolean.TRUE.equals(customer.getSuspended())) {
                        writeUnauthorized(response, "이용이 정지된 계정입니다. 고객센터로 문의해주세요.");
                        return;
                    }
                }
            } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
                // 토큰 자체가 만료/변조 등으로 잘못된 경우는 이 필터의 책임이 아니다.
                // 기존처럼 각 컨트롤러의 extractCustomerId()에서 파싱하다 동일한 예외로 처리되도록 그냥 통과시킨다.
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}