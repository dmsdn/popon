package popupteam.popupbackend.domain.business;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BusinessConsentRepository extends JpaRepository<BusinessConsent, Long> {
    Optional<BusinessConsent> findTopByBusinessIdOrderByAgreedAtDesc(Long businessId);
}