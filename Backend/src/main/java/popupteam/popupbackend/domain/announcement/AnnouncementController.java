package popupteam.popupbackend.domain.announcement;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.announcement.dto.AnnouncementCreateRequest;
import popupteam.popupbackend.domain.announcement.dto.AnnouncementResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;

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