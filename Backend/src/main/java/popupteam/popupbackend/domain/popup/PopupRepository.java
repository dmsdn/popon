package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PopupRepository extends JpaRepository<Popup, Long> {

    List<Popup> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE " +
            "(:location IS NULL OR p.location = :location) AND " +
            "(:status IS NULL OR p.status = :status) AND " +
            "(:keyword IS NULL OR p.title LIKE %:keyword% OR p.description LIKE %:keyword%) " +
            "ORDER BY p.createdAt DESC")
    List<Popup> search(@Param("location") String location,
                       @Param("status") PopupStatus status,
                       @Param("keyword") String keyword);

    List<Popup> findByStatusAndStartDateLessThanEqual(PopupStatus status, java.time.LocalDateTime startDate);
    List<Popup> findByStatusAndEndDateLessThanEqual(PopupStatus status, java.time.LocalDateTime endDate);

    long countByStatus(PopupStatus status);

    // 소비자의 관심지역(customer_region)에 해당하는 팝업만 조회할 때 사용
    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE " +
            "p.addressKeyword.id IN :regionIds AND p.status = :status " +
            "ORDER BY p.createdAt DESC")
    List<Popup> findByAddressKeywordIdInAndStatusOrderByCreatedAtDesc(@Param("regionIds") List<Long> regionIds,
                                                                      @Param("status") PopupStatus status);
}