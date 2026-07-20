package com.popupplatform.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "popup_wishlist")
@Getter
@Setter
@NoArgsConstructor
@IdClass(PopupWishlist.PK.class)
public class PopupWishlist {

    @Id
    @Column(name = "customer_id")
    private Long customerId;

    @Id
    @Column(name = "popup_id")
    private Long popupId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public static class PK implements Serializable {
        private Long customerId;
        private Long popupId;

        public PK() {}

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK)) return false;
            PK pk = (PK) o;
            return Objects.equals(customerId, pk.customerId) && Objects.equals(popupId, pk.popupId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(customerId, popupId);
        }
    }
}