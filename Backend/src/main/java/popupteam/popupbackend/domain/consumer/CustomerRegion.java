package popupteam.popupbackend.domain.consumer;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "customer_region")
@Getter
@Setter
@NoArgsConstructor
@IdClass(CustomerRegion.PK.class)
public class CustomerRegion {

    @Id
    @Column(name = "customer_id")
    private Long customerId;

    @Id
    @Column(name = "region_id")
    private Long regionId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public static class PK implements Serializable {
        private Long customerId;
        private Long regionId;

        public PK() {}

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK)) return false;
            PK pk = (PK) o;
            return Objects.equals(customerId, pk.customerId) && Objects.equals(regionId, pk.regionId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(customerId, regionId);
        }
    }
}