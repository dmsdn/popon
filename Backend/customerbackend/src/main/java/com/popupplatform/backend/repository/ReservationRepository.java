package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Reservation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
   List<Reservation> findByCustomerId(Long customerId);
}
