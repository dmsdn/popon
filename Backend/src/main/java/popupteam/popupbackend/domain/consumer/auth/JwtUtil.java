package popupteam.popupbackend.domain.consumer.auth;

// [통합 수정] jjwt 0.12.6 → 0.11.5 API로 이식 (popupbackend와 클래스패스 통일, 동작 동일)
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
   @Value("${jwt.secret}")
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