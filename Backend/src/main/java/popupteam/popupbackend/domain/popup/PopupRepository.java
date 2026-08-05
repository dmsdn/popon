package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface PopupRepository extends JpaRepository<Popup, Long> {

    List<Popup> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    @Query("SELECT p FROM Popup p JOIN FETCH p.business LEFT JOIN FETCH p.addressKeyword WHERE " +
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

    // 마스터 관리 - 이 지역을 선택한 팝업 수 (8/5). address_keyword가 region FK다
    long countByAddressKeyword_Id(Long regionId);

    // 소비자의 관심지역(customer_region)에 해당하는 팝업만 조회할 때 사용
    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE " +
            "p.addressKeyword.id IN :regionIds AND p.status = :status " +
            "ORDER BY p.createdAt DESC")
    List<Popup> findByAddressKeywordIdInAndStatusOrderByCreatedAtDesc(@Param("regionIds") List<Long> regionIds,
                                                                      @Param("status") PopupStatus status);

    // 관리자용 - 특정 지역 하나에 속한 팝업 전체 (상태 무관, 심사대기/반려 포함)
    @Query("SELECT p FROM Popup p JOIN FETCH p.business WHERE " +
            "p.addressKeyword.id = :regionId ORDER BY p.createdAt DESC")
    List<Popup> findByAddressKeywordIdOrderByCreatedAtDesc(@Param("regionId") Long regionId);

    // 지역 강제 삭제용: 이 지역을 참조하던 팝업들의 address_keyword를 null로 비움 (팝업 자체는 유지)
    @Modifying
    @Query("UPDATE Popup p SET p.addressKeyword = null WHERE p.addressKeyword.id = :regionId")
    void clearAddressKeywordByRegionId(@Param("regionId") Long regionId);

    // 혼잡 알림 스케줄러용 - 진행중인 팝업만 체크
    @Query("SELECT p FROM Popup p JOIN FETCH p.business LEFT JOIN FETCH p.addressKeyword WHERE p.status = :status")
    List<Popup> findByStatus(@Param("status") PopupStatus status);

    // 배너 등록 시 "진행중/오픈예정" 팝업만 골라 보여주기 위한 조회
    List<Popup> findByStatusInOrderByCreatedAtDesc(List<PopupStatus> statuses);

    // 오픈/종료 임박 알림 스케줄러용 - 특정 날짜에 시작/종료하는 팝업 조회
    @Query("SELECT p FROM Popup p WHERE FUNCTION('DATE', p.startDate) = :date AND p.status IN (popupteam.popupbackend.domain.popup.PopupStatus.BEFOR, popupteam.popupbackend.domain.popup.PopupStatus.OPEN)")
    List<Popup> findByStartDateOnDate(@Param("date") LocalDate date);

    @Query("SELECT p FROM Popup p WHERE FUNCTION('DATE', p.endDate) = :date AND p.status = popupteam.popupbackend.domain.popup.PopupStatus.OPEN")
    List<Popup> findByEndDateOnDate(@Param("date") LocalDate date);

    // 키워드 매칭 조회용 - N+1 방지
    @Query("SELECT p FROM Popup p JOIN FETCH p.business LEFT JOIN FETCH p.addressKeyword WHERE p.id IN :ids")
    List<Popup> findAllByIdWithBusiness(@Param("ids") List<Long> ids);
    // 비슷한 팝업 추천용 - 같은 지역의 다른 팝업 (자기 자신 제외, 특정 상태만)
    List<Popup> findByLocationAndStatusInAndIdNot(String location, List<PopupStatus> statuses, Long id);
    // 주최자 "내 팝업 목록"용 - 지역명(regionName)까지 N+1 없이 한 번에 조회
    @Query("SELECT p FROM Popup p JOIN FETCH p.business LEFT JOIN FETCH p.addressKeyword " +
            "WHERE p.business.id = :businessId ORDER BY p.createdAt DESC")
    List<Popup> findByBusinessIdWithRegion(@Param("businessId") Long businessId);
}