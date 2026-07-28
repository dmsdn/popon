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

    // 카카오/구글이 전화번호/이메일을 안 줘서, 첫 로그인 후 "회원정보 입력" 화면에서 직접 받는 값들.
    @Column(name = "terms_agreed", nullable = false)
    private Boolean termsAgreed = false; // [필수] 서비스 이용약관 동의

    @Column(name = "privacy_agreed", nullable = false)
    private Boolean privacyAgreed = false; // [필수] 개인정보 수집 및 이용 동의

    @Column(name = "location_agreed", nullable = false)
    private Boolean locationAgreed = false; // [선택] 위치 정보 이용 동의

    @Column(name = "marketing_agreed", nullable = false)
    private Boolean marketingAgreed = false; // [선택] 마케팅 정보 수신 동의

    // "회원정보 입력" 화면(닉네임/전화번호/이메일/약관동의)을 마쳤는지 여부.
    // 이게 false면 프론트가 로그인 직후 이 화면으로 보내면 됨.
    @Column(name = "signup_completed", nullable = false)
    private Boolean signupCompleted = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private Boolean withdrawn = false;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    // 관리자가 강제로 정지시킨 계정인지 여부 (본인 탈퇴와는 별개 개념)
    @Column(nullable = false)
    private Boolean suspended = false;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

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