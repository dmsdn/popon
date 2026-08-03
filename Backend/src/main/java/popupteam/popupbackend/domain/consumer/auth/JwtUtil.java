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
   // 8/3 — 서명키를 직원용(security/JwtUtil)과 분리했다.
   //
   // 그전에는 둘 다 jwt.secret 하나로 서명해서, 관리자·주최자 토큰을 이 파서에 넣어도
   // **서명 검증이 통과**했다. "우리 토큰이 아니면 파싱에서 예외가 난다"는 전제가
   // 무너진 상태였고, 실제로 8/3에 CustomerAuthCheckFilter가 관리자 토큰의 없는
   // id 클레임을 읽다 NPE → 두 콘솔 전체 500으로 터졌다.
   // 키가 다르면 남의 토큰은 SignatureException으로 파싱 단계에서 튕긴다 —
   // 신원 구분이 클레임 모양이 아니라 암호학으로 보장된다.
   // 기본값 없음 = 설정이 빠지면 안 뜨는 게 의도다 (qr-base-url과 같은 원칙).
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
      // 8/3 — "id" 클레임이 없는 토큰이 들어오면 예전엔 여기서 NPE가 나 그대로 500으로 튀었다.
      // (주최자·관리자 토큰은 security/JwtUtil이 발급하며 id 없이 subject에 이메일만 담는다.
      //  당시엔 두 발급기가 jwt.secret 하나를 공유해서 **서명 검증이 통과**했고, 그래서
      //  "우리 토큰이 아니면 파싱에서 예외가 난다"는 전제가 무너져 있었다. 위 consumer-secret
      //  분리로 그 전제는 복구됐지만, 이 검사는 방어선으로 남긴다.)
      //
      // null 반환이 아니라 IllegalArgumentException을 던지는 쪽을 택했다 —
      // 호출부(CustomerAuthCheckFilter 등)의 기존 catch (JwtException | IllegalArgumentException)가
      // 그대로 받아 주고, 나머지 소비자 컨트롤러 15곳도 null이 findById로 흘러드는 대신
      // GlobalExceptionHandler에서 깔끔히 처리된다.
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