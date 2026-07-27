package popupteam.popupbackend.domain.wishlist;

import popupteam.popupbackend.domain.wishlist.PopupWishlist;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PopupWishlistRepository extends JpaRepository<PopupWishlist, PopupWishlist.PK> {
   List<PopupWishlist> findByCustomerId(Long customerId);
   List<PopupWishlist> findByPopupId(Long popupId);

   Optional<PopupWishlist> findByCustomerIdAndPopupId(Long customerId, Long popupId);

   // 인기 팝업 랭킹 계산용 - 팝업별 찜 개수를 한 번에 집계
   @Query("SELECT w.popupId, COUNT(w) FROM PopupWishlist w GROUP BY w.popupId")
   List<Object[]> countAllGroupByPopupId();
}