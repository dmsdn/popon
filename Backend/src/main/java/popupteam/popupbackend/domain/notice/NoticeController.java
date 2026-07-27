package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.notice.dto.NoticeSendRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/popups/{popupId}/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final BusinessRepository businessRepository;

    private Long getBusinessId(Authentication authentication) {
        Business business = businessRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
        return business.getId();
    }

    @PostMapping
    public ResponseEntity<?> send(@PathVariable Long popupId,
                                  Authentication authentication,
                                  @Valid @RequestBody NoticeSendRequest request) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.status(201)
                .body(noticeService.sendFromOrganizer(popupId, businessId, authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<?> getHistory(@PathVariable Long popupId, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.ok(noticeService.getOrganizerHistory(popupId, businessId));
    }
}