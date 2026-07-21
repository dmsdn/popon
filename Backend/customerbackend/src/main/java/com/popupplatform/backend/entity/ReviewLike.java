package com.popupplatform.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "review_like")
@Getter
@Setter
@NoArgsConstructor
@IdClass(ReviewLike.PK.class)
public class ReviewLike {

    @Id
    @Column(name = "review_id")
    private Long reviewId;

    @Id
    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public static class PK implements Serializable {
        private Long reviewId;
        private Long customerId;

        public PK() {}

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK)) return false;
            PK pk = (PK) o;
            return Objects.equals(reviewId, pk.reviewId) && Objects.equals(customerId, pk.customerId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(reviewId, customerId);
        }
    }
}