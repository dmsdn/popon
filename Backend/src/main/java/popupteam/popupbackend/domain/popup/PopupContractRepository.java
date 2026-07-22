package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PopupContractRepository extends JpaRepository<PopupContract, Long> {
    Optional<PopupContract> findByPopupId(Long popupId);

    @Query("SELECT FUNCTION('DATE', c.createdAt) as period, SUM(c.contractAmount) as total " +
            "FROM PopupContract c WHERE c.createdAt >= :fromDate " +
            "GROUP BY FUNCTION('DATE', c.createdAt) ORDER BY FUNCTION('DATE', c.createdAt) ASC")
    List<RevenueProjection> sumDailyRevenueSince(@Param("fromDate") java.time.LocalDateTime fromDate);

    @Query("SELECT FUNCTION('DATE_FORMAT', c.createdAt, '%Y-%m') as period, SUM(c.contractAmount) as total " +
            "FROM PopupContract c WHERE c.createdAt >= :fromDate " +
            "GROUP BY FUNCTION('DATE_FORMAT', c.createdAt, '%Y-%m') ORDER BY FUNCTION('DATE_FORMAT', c.createdAt, '%Y-%m') ASC")
    List<RevenueProjection> sumMonthlyRevenueSince(@Param("fromDate") java.time.LocalDateTime fromDate);

    interface RevenueProjection {
        String getPeriod();
        java.math.BigDecimal getTotal();
    }
}