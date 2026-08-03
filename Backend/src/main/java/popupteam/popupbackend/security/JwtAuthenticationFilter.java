package popupteam.popupbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                String email = jwtUtil.getEmailFromToken(token);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(email, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (io.jsonwebtoken.security.SignatureException e) {
                // 8/3 — 서명이 다르면 **남의 토큰**이다(키 분리 후 소비자 토큰이 여기 걸린다).
                // 이 필터도 @Component 전역 자동 등록이라 소비자 요청까지 전부 탄다.
                // 분리 전에는 공유 키 탓에 소비자 토큰이 파싱을 통과해 조용히 지나갔는데,
                // 분리 후 여기서 401을 쓰는 바람에 소셜 로그인 직후 /api/customer/me가
                // 사살되고, 프론트의 강제 로그아웃까지 연쇄로 발동했다 (8/3 사고 2).
                // 남의 토큰은 거부가 아니라 **무시**가 맞다 — 인증을 못 채웠을 뿐이니
                // 통과시키고, 보호된 자원이면 뒤의 인가 단계가 거절한다.
            } catch (io.jsonwebtoken.ExpiredJwtException e) {
                // 필터 단계에서 던져진 예외는 @RestControllerAdvice(GlobalExceptionHandler)까지 도달하지 않으므로
                // (DispatcherServlet 이전 단계라 컨트롤러 예외 처리 대상이 아님) 여기서 직접 동일한 형식으로 응답한다.
                writeUnauthorized(response, "로그인이 만료되었습니다. 다시 로그인해주세요.");
                return;
            } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
                writeUnauthorized(response, "유효하지 않은 인증 정보입니다. 다시 로그인해주세요.");
                return;
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