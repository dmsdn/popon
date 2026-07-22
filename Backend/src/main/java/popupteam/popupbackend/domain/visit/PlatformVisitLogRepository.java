package popupteam.popupbackend.domain.visit;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface PlatformVisitLogRepository extends JpaRepository<PlatformVisitLog, Long> {

    boolean existsByVisitorKeyAndVisitDateAndAppSource(String visitorKey, LocalDate visitDate, AppSource appSource);

    @Query("SELECT v.visitDate as date, COUNT(v) as count FROM PlatformVisitLog v " +
            "WHERE v.visitDate >= :fromDate " +
            "GROUP BY v.visitDate ORDER BY v.visitDate ASC")
    List<DailyCountProjection> countDailyVisitsSince(@Param("fromDate") LocalDate fromDate);

    interface DailyCountProjection {
        LocalDate getDate();
        Long getCount();
    }
}