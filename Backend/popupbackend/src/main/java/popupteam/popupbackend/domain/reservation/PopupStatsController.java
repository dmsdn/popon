package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.reservation.dto.PopupVisitorRankingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class PopupStatsController {

    private final PopupStatsService popupStatsService;

    @GetMapping("/popup-ranking")
    public ResponseEntity<List<PopupVisitorRankingResponse>> getVisitorRanking(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        if (!isAdmin) {
            throw new ForbiddenException("관리자만 조회할 수 있습니다.");
        }

        return ResponseEntity.ok(popupStatsService.getVisitorRanking(date));
    }
}