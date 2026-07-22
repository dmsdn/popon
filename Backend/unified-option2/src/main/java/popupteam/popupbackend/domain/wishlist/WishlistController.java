package popupteam.popupbackend.domain.wishlist;

import popupteam.popupbackend.domain.wishlist.PopupWishlist;
import popupteam.popupbackend.domain.wishlist.PopupWishlistRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final PopupWishlistRepository wishlistRepository;
    private final JwtUtil jwtUtil;

    // 찜 목록 조회
    @GetMapping
    public List<Long> getWishlist(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);

        return wishlistRepository.findByCustomerId(customerId)
                .stream()
                .map(PopupWishlist::getPopupId)
                .toList();
    }

    // 찜 추가
    @PostMapping
    public Map<String, Object> addWishlist(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Long> body
    ) {
        Long customerId = extractCustomerId(authHeader);
        Long popupId = body.get("popupId");

        // 이미 찜한 경우 중복 저장 방지
        if (wishlistRepository.findByCustomerIdAndPopupId(customerId, popupId).isEmpty()) {
            PopupWishlist wishlist = new PopupWishlist();
            wishlist.setCustomerId(customerId);
            wishlist.setPopupId(popupId);
            wishlistRepository.save(wishlist);
        }

        return Map.of("success", true);
    }

    // 찜 삭제
    @DeleteMapping("/{popupId}")
    public Map<String, Object> removeWishlist(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long popupId
    ) {
        Long customerId = extractCustomerId(authHeader);

        wishlistRepository.findByCustomerIdAndPopupId(customerId, popupId)
                .ifPresent(wishlistRepository::delete);

        return Map.of("success", true);
    }

    // 토큰에서 customerId 뽑아내는 공통 로직
    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }
}