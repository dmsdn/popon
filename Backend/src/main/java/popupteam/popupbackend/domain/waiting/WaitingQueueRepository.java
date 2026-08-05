package popupteam.popupbackend.domain.waiting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WaitingQueueRepository extends JpaRepository<WaitingQueue, Long> {

    List<WaitingQueue> findByPopupIdAndStatusOrderByRegisteredAtAsc(Long popupId, WaitingStatus status);

    // 태블릿 현황판의 「현재 대기 팀」 (8/6 신설).
    //
    // 원래 위의 findByPopupIdAndStatus…를 썼는데 날짜 조건이 없어 전 기간 WAITING이 다 잡혔다.
    // 자정 리셋이 매일 어제치를 닫아 주니 결과적으로 오늘치만 남는다는 전제였는데,
    // 리셋이 하루라도 걸리면 그 날짜가 영구히 남아 태블릿 숫자만 부풀었다.
    // (8/6 실측: 팝업 53의 태블릿이 3팀, 관제가 2팀 — 차이는 8/3에 방치된 1건이었다.)
    //
    // 배치의 부작용에 기대지 않고 화면이 스스로 오늘을 자른다. 관제(findDayRoster)와 같은 기준이다.
    @Query("SELECT w FROM WaitingQueue w WHERE w.popup.id = :popupId AND w.status = :status " +
            "AND w.registeredAt >= :startOfDay AND w.registeredAt < :endOfDay " +
            "ORDER BY w.registeredAt ASC")
    List<WaitingQueue> findDayBoard(@Param("popupId") Long popupId,
                                    @Param("status") WaitingStatus status,
                                    @Param("startOfDay") LocalDateTime startOfDay,
                                    @Param("endOfDay") LocalDateTime endOfDay);

    // 하루치 웨이팅 전부 — 상태를 가리지 않는다 (8/4).
    // 관제 화면이 「그날의 명단」을 보여주기 위한 쿼리다. 입장·취소된 건도 함께 와야
    // 처리 결과가 배지로 남고, 지난 날짜를 골랐을 때 그날 기록을 그대로 볼 수 있다.
    @Query("SELECT w FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.registeredAt >= :startOfDay AND w.registeredAt < :endOfDay " +
            "ORDER BY w.registeredAt ASC")
    List<WaitingQueue> findDayRoster(@Param("popupId") Long popupId,
                                     @Param("startOfDay") LocalDateTime startOfDay,
                                     @Param("endOfDay") LocalDateTime endOfDay);

    // 자정 리셋 대상 — 그날 안에 아무 처리도 되지 않은 채 남은 대기 (8/4)
    @Query("SELECT w FROM WaitingQueue w WHERE w.status IN :statuses " +
            "AND w.registeredAt >= :startOfDay AND w.registeredAt < :endOfDay")
    List<WaitingQueue> findUnprocessedOfDay(@Param("statuses") List<WaitingStatus> statuses,
                                            @Param("startOfDay") LocalDateTime startOfDay,
                                            @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COALESCE(MAX(w.teamNumber), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.registeredAt >= :startOfDay")
    Integer findMaxTeamNumberToday(@Param("popupId") Long popupId, @Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT COUNT(w) FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'WAITING' AND w.id < :id")
    long countAheadOf(@Param("popupId") Long popupId, @Param("id") Long id);

    // 호출 폐지(8/4)로 사용처가 사라졌다. CALLED를 만드는 경로가 없어 항상 빈 목록이 온다.
    // 스키마(call_expires_at)와 함께 남겨 두되 새로 쓰지 말 것.
    @Deprecated
    List<WaitingQueue> findByStatusAndCallExpiresAtBefore(WaitingStatus status, LocalDateTime time);

    java.util.Optional<WaitingQueue> findByQrToken(String qrToken);

    @Query("SELECT COUNT(w) FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'ENTERED' AND w.enteredAt >= :since")
    long countRecentlyEntered(@Param("popupId") Long popupId, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT w FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'ENTERED' AND w.exitedAt IS NULL " +
            "ORDER BY w.enteredAt ASC")
    List<WaitingQueue> findCurrentlyInsideByPopupId(@Param("popupId") Long popupId);
    // 팝업 구분 없이 전체 입장 상태(아직 퇴장 전) 조회 - 자동퇴장 스케줄러용
    List<WaitingQueue> findByStatusAndExitedAtIsNull(WaitingStatus status);

    List<WaitingQueue> findByPopupIdAndStatusIn(Long popupId, List<WaitingStatus> statuses);

    // 내 웨이팅 목록 조회용 (현재 대기중/호출됨 상태만, 여러 팝업 통틀어)
    List<WaitingQueue> findByCustomerIdAndStatusInOrderByRegisteredAtDesc(Long customerId, List<WaitingStatus> statuses);

    // 같은 계정의 동일 팝업 중복 웨이팅 방지용 - 이미 대기중/호출됨 상태인 웨이팅이 있는지 확인
    boolean existsByPopupIdAndCustomerIdAndStatusIn(Long popupId, Long customerId, List<WaitingStatus> statuses);
    // 후기 작성 가능 여부 확인용 - 이 소비자가 이 팝업에 실제로 입장(ENTERED)한 웨이팅 기록이 있는지
    boolean existsByPopupIdAndCustomerIdAndStatus(Long popupId, Long customerId, WaitingStatus status);

    // 누적 방문자 통계용 - 웨이팅으로 입장한 전원(회원+비회원). 헤드카운트일 뿐 개인정보가 필요 없어서 비회원도 포함.
    @Query("SELECT COALESCE(SUM(w.partySize), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.status = 'ENTERED'")
    long sumMemberVisitorsOfEntered(@Param("popupId") Long popupId);

    // 일별 방문자 추이용 - 웨이팅으로 입장한 전원(회원+비회원)을 날짜별로 집계
    @Query("SELECT FUNCTION('DATE', w.enteredAt), COALESCE(SUM(w.partySize), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.status = 'ENTERED' " +
            "AND w.enteredAt >= :from AND w.enteredAt < :to " +
            "GROUP BY FUNCTION('DATE', w.enteredAt) ORDER BY FUNCTION('DATE', w.enteredAt)")
    List<Object[]> countDailyMemberEntered(@Param("popupId") Long popupId,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to);

    // 연령/성별 통계용 - 회원 웨이팅 입장자의 customer id 목록 (비회원 제외, 전체 Customer 테이블 재조회에 사용)
    @Query("SELECT w.customer.id FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.status = 'ENTERED' AND w.customer IS NOT NULL")
    List<Long> findMemberCustomerIdsOfEntered(@Param("popupId") Long popupId);

    // 웨이팅 신청 수(누적, 인기도 판별용) - 취소돼도 차감 안 하고 그동안 신청된 전체 건수
    long countByPopupId(Long popupId);

}