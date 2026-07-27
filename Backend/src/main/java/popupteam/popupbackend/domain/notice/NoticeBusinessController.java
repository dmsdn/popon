package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business/notices/my")
@RequiredArgsConstructor
public class NoticeBusinessController {

    private final NoticeService noticeService;
    private final BusinessRepository businessRepository;

    private Long getBusinessId(Authentication authentication) {
        Business business = businessRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
        return business.getId();
    }

    @GetMapping
    public ResponseEntity<?> getMyNotices(Authentication authentication,
                                          @RequestParam(required = false) String category) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.ok(noticeService.getBusinessInbox(businessId, category));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.ok(java.util.Map.of("unreadCount", noticeService.getBusinessUnreadCount(businessId)));
    }

    @PatchMapping("/{recipientId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long recipientId, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        noticeService.markBusinessRead(recipientId, businessId);
        return ResponseEntity.ok(java.util.Map.of("message", "읽음 처리되었습니다."));
    }
}