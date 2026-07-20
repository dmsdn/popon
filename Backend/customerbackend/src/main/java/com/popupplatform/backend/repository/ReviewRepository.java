package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCustomerId(Long customerId);
}