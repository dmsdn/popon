package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.PopupWishlist;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PopupWishlistRepository extends JpaRepository<PopupWishlist, PopupWishlist.PK> {
   List<PopupWishlist> findByCustomerId(Long customerId);

   Optional<PopupWishlist> findByCustomerIdAndPopupId(Long customerId, Long popupId);
}
