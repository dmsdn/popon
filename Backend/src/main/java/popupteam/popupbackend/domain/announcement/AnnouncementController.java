package popupteam.popupbackend.domain.announcement;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.announcement.dto.AnnouncementCreateRequest;
import popupteam.popupbackend.domain.announcement.dto.AnnouncementResponse;
import popupteam.popupbackend.domain.notice.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;
    private final NoticeService noticeService;

    private void checkAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // === 관리자용 ===
    @PostMapping("/api/admin/announcements")
    public ResponseEntity<?> create(Authentication authentication, @Valid @RequestBody AnnouncementCreateRequest request) {
        checkAdmin(authentication);

        Announcement announcement = new Announcement();
        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());
        Announcement saved = announcementRepository.save(announcement);

        // [수정 8/5] 공지 게시판에 저장만 하고 알림함(notice·notice_recipient)에는
        // 아무것도 안 남기고 있었다 — 「관리자가 보낸 공지 알림이 안 온다」의 원인.
        //
        // 알림 적재가 실패해도 공지 등록 자체는 성공으로 둔다. 공지는 이미 저장됐고
        // /api/announcements로 소비자에게 보인다 — 알림이 안 갔다고 그걸 되돌리면
        // 관리자는 「등록이 실패했다」고 읽고 다시 등록해 공지가 중복된다.
        // 대신 로그로 남겨 못 간 사실이 묻히지 않게 한다.
        try {
            noticeService.notifyAnnouncementCreated(saved);
        } catch (Exception e) {
            log.error("공지 알림 발송 실패 (공지는 등록됨) — announcementId={}", saved.getId(), e);
        }

        return ResponseEntity.status(201).body(AnnouncementResponse.from(saved));
    }

    @GetMapping("/api/admin/announcements")
    public ResponseEntity<?> getAllForAdmin(Authentication authentication) {
        checkAdmin(authentication);
        List<AnnouncementResponse> list = announcementRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(AnnouncementResponse::from)
                .toList();
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/api/admin/announcements/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        announcementRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // === 공개(소비자)용 ===
    @GetMapping("/api/announcements")
    public ResponseEntity<?> getActiveAnnouncements() {
        List<AnnouncementResponse> list = announcementRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(AnnouncementResponse::from)
                .toList();
        return ResponseEntity.ok(list);
    }
}