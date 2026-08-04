package popupteam.popupbackend.domain.banner;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    List<Banner> findAllByOrderBySortOrderAsc();

    @Query("SELECT COALESCE(MAX(b.sortOrder), -1) FROM Banner b")
    Integer findMaxSortOrder();

    @Query("SELECT b FROM Banner b WHERE b.active = true " +
            "AND (b.startDate IS NULL OR b.startDate <= :now) " +
            "AND (b.endDate IS NULL OR b.endDate >= :now) " +
            "ORDER BY b.sortOrder ASC")
    List<Banner> findActiveBanners(@Param("now") LocalDateTime now);
}