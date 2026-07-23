package popupteam.popupbackend.domain.consumer;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.nimbusds.openid.connect.sdk.claims.Gender;

@Entity(name = "CustomerAccount")  // [통합 수정] popupbackend의 참조용 Customer 엔티티와 JPA 엔티티명 충돌 회피
@Table(name = "customer")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    // 소셜 제공자가 주는 원본 고유 ID (불변, 로그인 매칭용).
    // providerId는 재가입 시 "원본id_2" 처럼 표시용으로 바뀔 수 있지만 socialId는 절대 안 바뀜.
    @Column(name = "social_id")
    private String socialId;

    private String email;

    @Column(nullable = false)
    private String nickname;

    @Column(name = "profile_image")
    private String profileImage;

    private String phone;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private Boolean withdrawn = false;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender = Gender.UNKNOWN;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum Provider {
        KAKAO, GOOGLE, DEV
    }

    public enum Gender {
    MALE, FEMALE, UNKNOWN
}
}