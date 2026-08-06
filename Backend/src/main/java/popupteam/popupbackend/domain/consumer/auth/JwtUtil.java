package popupteam.popupbackend.domain.consumer.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
   // 소비자 토큰 서명키를 직원용(security/JwtUtil)과 분리해서 사용한다.
   // 키가 같으면 관리자·주최자 토큰도 이 파서의 서명 검증을 통과해버려서,
   // "우리 토큰이 아니면 파싱에서 예외가 난다"는 전제가 깨진다.
   // 키를 분리하면 남의 토큰은 서명 검증 단계(SignatureException)에서 걸러지므로,
   // 토큰 신원 구분이 클레임 모양이 아니라 암호학적으로 보장된다.
   // 기본값을 두지 않은 것은 의도적이다 — 설정이 빠지면 앱이 뜨지 않아야 한다(qr-base-url과 동일한 원칙).
   @Value("${jwt.consumer-secret}")
   private String secret;
   @Value("${jwt.expiration}")
   private long expiration;

   public JwtUtil() {
   }

   public String generateToken(Long customerId, String nickname, String provider) {
      SecretKey key = Keys.hmacShaKeyFor(this.secret.getBytes());
      return Jwts.builder()
              .claim("id", customerId)
              .claim("nickname", nickname)
              .claim("provider", provider)
              .setIssuedAt(new Date())
              .setExpiration(new Date(System.currentTimeMillis() + this.expiration))
              .signWith(key, SignatureAlgorithm.HS256)
              .compact();
   }

   public Long getCustomerIdFromToken(String token) {
      SecretKey key = Keys.hmacShaKeyFor(this.secret.getBytes());
      Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
      // id 값이 작으면 JJWT/Jackson이 Integer로 역직렬화해버려서 claims.get("id", Long.class)가
      // RequiredTypeException을 던짐. Number로 받아서 안전하게 long으로 변환.
      Number id = claims.get("id", Number.class);
      // "id" 클레임이 없는 토큰(주최자·관리자 토큰 등, security/JwtUtil이 발급하며 id 없이
      // subject에 이메일만 담는다)이 서명 검증까지 통과해 들어오는 경우를 막기 위한 방어선이다.
      // null 반환이 아니라 IllegalArgumentException을 던지는 이유는, 호출부
      // (CustomerAuthCheckFilter 등)의 catch (JwtException | IllegalArgumentException)가
      // 그대로 받아 처리하고, 나머지 소비자 컨트롤러들도 null이 findById로 흘러드는 대신
      // GlobalExceptionHandler에서 일관되게 처리되도록 하기 위함이다.
      if (id == null) {
         throw new IllegalArgumentException("토큰에 customer id(\"id\") 클레임이 없습니다.");
      }
      return id.longValue();
   }

   /**
    * 신규 소셜 가입자용 "가입대기 토큰".
    * 아직 DB에 Customer row를 안 만든 상태에서, 전화번호/약관동의 받을 때까지
    * 소셜 정보(provider/socialId/닉네임/이메일/프로필사진)를 잠깐 들고 있는 용도.
    * "id" 클레임이 없어서 getCustomerIdFromToken()으로는 못 씀 (의도된 동작 - 가입 완료 전엔 customerId 자체가 없음).
    * 유효시간 10분으로 짧게 잡음 (그 사이에 회원정보 입력 안 끝내면 처음부터 다시 로그인해야 함).
    */
   public String generatePendingSignupToken(String provider, String socialId, String nickname,
                                             String email, String profileImage) {
      SecretKey key = Keys.hmacShaKeyFor(this.secret.getBytes());
      return Jwts.builder()
              .claim("pending", true)
              .claim("provider", provider)
              .claim("socialId", socialId)
              .claim("nickname", nickname)
              .claim("email", email)
              .claim("profileImage", profileImage)
              .setIssuedAt(new Date())
              .setExpiration(new Date(System.currentTimeMillis() + 10 * 60 * 1000L)) // 10분
              .signWith(key, SignatureAlgorithm.HS256)
              .compact();
   }

   // 토큰이 "가입대기 토큰"인지 여부 (true면 아직 DB에 Customer row가 없는 상태)
   public boolean isPendingSignupToken(String token) {
      Claims claims = parseClaims(token);
      return Boolean.TRUE.equals(claims.get("pending", Boolean.class));
   }

   public Claims parseClaims(String token) {
      SecretKey key = Keys.hmacShaKeyFor(this.secret.getBytes());
      return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
   }
}