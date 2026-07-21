package com.popupplatform.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.nimbusds.openid.connect.sdk.claims.Gender;

@Entity
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
        KAKAO, GOOGLE
    }

    public enum Gender {
    MALE, FEMALE, UNKNOWN
}
}