package popupteam.popupbackend.domain.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notices/my")
@RequiredArgsConstructor
public class NoticeConsumerController {

    private final NoticeService noticeService;

    @GetMapping
    public ResponseEntity<?> getMyNotices(@RequestParam Long customerId,
                                          @RequestParam(required = false) String category) {
        return ResponseEntity.ok(noticeService.getCustomerInbox(customerId, category));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam Long customerId) {
        return ResponseEntity.ok(java.util.Map.of("unreadCount", noticeService.getCustomerUnreadCount(customerId)));
    }

    @PatchMapping("/{recipientId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long recipientId, @RequestParam Long customerId) {
        noticeService.markCustomerRead(recipientId, customerId);
        return ResponseEntity.ok(java.util.Map.of("message", "읽음 처리되었습니다."));
    }
}