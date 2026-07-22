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
      return claims.get("id", Long.class);
   }
}
