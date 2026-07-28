package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
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

    // 혼잡 알림 스케줄러용 - 진행중인 팝업만 체크
    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE p.status = :status")
    List<Popup> findByStatus(@Param("status") PopupStatus status);

    // 오픈/종료 임박 알림 스케줄러용 - 특정 날짜에 시작/종료하는 팝업 조회
    @Query("SELECT p FROM Popup p WHERE FUNCTION('DATE', p.startDate) = :date AND p.status IN (popupteam.popupbackend.domain.popup.PopupStatus.BEFOR, popupteam.popupbackend.domain.popup.PopupStatus.OPEN)")
    List<Popup> findByStartDateOnDate(@Param("date") LocalDate date);

    @Query("SELECT p FROM Popup p WHERE FUNCTION('DATE', p.endDate) = :date AND p.status = popupteam.popupbackend.domain.popup.PopupStatus.OPEN")
    List<Popup> findByEndDateOnDate(@Param("date") LocalDate date);

    // 키워드 매칭 조회용 - N+1 방지
    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE p.id IN :ids")
    List<Popup> findAllByIdWithBusiness(@Param("ids") List<Long> ids);
    // 비슷한 팝업 추천용 - 같은 지역의 다른 팝업 (자기 자신 제외, 특정 상태만)
    List<Popup> findByLocationAndStatusInAndIdNot(String location, List<PopupStatus> statuses, Long id);
}