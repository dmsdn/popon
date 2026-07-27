package popupteam.popupbackend.domain.wishlist;

import popupteam.popupbackend.domain.wishlist.PopupWishlist;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PopupWishlistRepository extends JpaRepository<PopupWishlist, PopupWishlist.PK> {
   List<PopupWishlist> findByCustomerId(Long customerId);
   List<PopupWishlist> findByPopupId(Long popupId);

   Optional<PopupWishlist> findByCustomerIdAndPopupId(Long customerId, Long popupId);
}