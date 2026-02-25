package com.newssentiment.security;

import com.newssentiment.model.Organization;
import com.newssentiment.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generate token with organization claims if the user has an organization.
     */
    public String generateTokenWithOrgClaims(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());

        Organization org = user.getOrganization();
        if (org != null) {
            claims.put("orgId", org.getId());
            claims.put("orgSlug", org.getSlug());
            claims.put("orgName", org.getName());
        }

        return buildToken(claims, user, jwtExpiration);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    public long getExpirationTime() {
        return jwtExpiration;
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extract organization ID from token claims.
     */
    public Long extractOrganizationId(String token) {
        Claims claims = extractAllClaims(token);
        Object orgId = claims.get("orgId");
        if (orgId == null) return null;
        if (orgId instanceof Integer) return ((Integer) orgId).longValue();
        if (orgId instanceof Long) return (Long) orgId;
        return Long.parseLong(orgId.toString());
    }

    /**
     * Extract organization slug from token claims.
     */
    public String extractOrganizationSlug(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("orgSlug", String.class);
    }

    /**
     * Extract organization name from token claims.
     */
    public String extractOrganizationName(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("orgName", String.class);
    }

    /**
     * Extract user role from token claims.
     */
    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("role", String.class);
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
