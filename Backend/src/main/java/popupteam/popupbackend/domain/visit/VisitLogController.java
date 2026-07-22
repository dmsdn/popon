package popupteam.popupbackend.domain.visit;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.visit.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class VisitLogController {

    private final PlatformVisitLogService platformVisitLogService;

    @PostMapping("/api/visits/log")
    public ResponseEntity<?> logVisit(@Valid @RequestBody VisitLogRequest request) {
        platformVisitLogService.logVisit(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/admin/stats/visits")
    public ResponseEntity<List<DailyVisitCountResponse>> getTrend(
            Authentication authentication,
            @RequestParam(defaultValue = "49") int days) {

        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        if (!isAdmin) {
            throw new ForbiddenException("관리자만 조회할 수 있습니다.");
        }

        return ResponseEntity.ok(platformVisitLogService.getTrend(days));
    }
}