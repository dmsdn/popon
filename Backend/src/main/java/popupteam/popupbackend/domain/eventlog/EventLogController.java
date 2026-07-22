package popupteam.popupbackend.domain.eventlog;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.eventlog.dto.EventLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class EventLogController {

    private final TransactionEventLogRepository transactionEventLogRepository;

    @GetMapping("/api/admin/popups/{popupId}/event-log")
    public ResponseEntity<List<EventLogResponse>> getEventLog(@PathVariable Long popupId,
                                                              Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(
                transactionEventLogRepository.findByPopupIdOrderByCreatedAtDesc(popupId).stream()
                        .map(EventLogResponse::from)
                        .collect(java.util.stream.Collectors.toList()));
    }
}