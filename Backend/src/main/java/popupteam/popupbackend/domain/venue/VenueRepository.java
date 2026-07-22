package popupteam.popupbackend.domain.venue;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Long> {
    List<Venue> findByStatusOrderByCreatedAtDesc(VenueStatus status);
    List<Venue> findAllByOrderByCreatedAtDesc();
}