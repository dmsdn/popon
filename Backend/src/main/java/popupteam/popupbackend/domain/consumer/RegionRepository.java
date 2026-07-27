package popupteam.popupbackend.domain.consumer;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, Long> {
    boolean existsByName(String name);
}