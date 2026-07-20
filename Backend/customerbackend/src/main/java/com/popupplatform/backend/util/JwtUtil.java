package com.popupplatform.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
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
      return Jwts.builder().claim("id", customerId).claim("nickname", nickname).claim("provider", provider).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + this.expiration)).signWith(key).compact();
   }

   public Long getCustomerIdFromToken(String token) {
      SecretKey key = Keys.hmacShaKeyFor(this.secret.getBytes());
      Claims claims = (Claims)Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
      return (Long)claims.get("id", Long.class);
   }
}
