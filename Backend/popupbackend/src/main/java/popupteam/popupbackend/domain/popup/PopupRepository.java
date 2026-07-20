package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PopupRepository extends JpaRepository<Popup, Long> {

    List<Popup> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    @Query("SELECT p FROM Popup p WHERE " +
            "(:location IS NULL OR p.location = :location) AND " +
            "(:status IS NULL OR p.status = :status) AND " +
            "(:keyword IS NULL OR p.title LIKE %:keyword% OR p.description LIKE %:keyword%) " +
            "ORDER BY p.createdAt DESC")
    List<Popup> search(@Param("location") String location,
                       @Param("status") PopupStatus status,
                       @Param("keyword") String keyword);

    // === 여기 추가 ===
    long countByStatus(PopupStatus status);
}