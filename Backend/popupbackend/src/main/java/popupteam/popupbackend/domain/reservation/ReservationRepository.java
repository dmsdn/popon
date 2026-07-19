package popupteam.popupbackend.domain.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findBySlotId(Long slotId);
    List<Reservation> findByCustomerId(Long customerId);

    @Query("SELECT r FROM Reservation r WHERE r.slot.popup.id = :popupId " +
            "ORDER BY r.slot.slotDate ASC, r.slot.startTime ASC, r.createdAt ASC")
    List<Reservation> findByPopupId(@Param("popupId") Long popupId);
}