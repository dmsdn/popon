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