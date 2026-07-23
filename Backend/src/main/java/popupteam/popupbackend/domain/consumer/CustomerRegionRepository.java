package popupteam.popupbackend.domain.consumer;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRegionRepository extends JpaRepository<CustomerRegion, CustomerRegion.PK> {
    void deleteByCustomerId(Long customerId);
    java.util.List<CustomerRegion> findByCustomerId(Long customerId);
}