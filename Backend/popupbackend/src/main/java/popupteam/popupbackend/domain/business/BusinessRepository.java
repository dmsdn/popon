package popupteam.popupbackend.domain.business;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {
    Optional<Business> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByBusinessNumber(String businessNumber);
}