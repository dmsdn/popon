package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.popup.dto.ContractResponse;
import popupteam.popupbackend.domain.popup.dto.ContractSetRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import popupteam.popupbackend.domain.popup.dto.ContractStageUpdateRequest;

@RestController
@RequiredArgsConstructor
public class PopupContractController {

    private final PopupContractService popupContractService;

    // 관리자 전용: 계약금 등록/수정
    @PutMapping("/api/admin/popups/{popupId}/contract")
    public ResponseEntity<?> setContract(@PathVariable Long popupId,
                                         Authentication authentication,
                                         @Valid @RequestBody ContractSetRequest request) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        if (!isAdmin) {
            throw new ForbiddenException("관리자만 계약금을 등록/수정할 수 있습니다.");
        }
        return ResponseEntity.ok(popupContractService.setContract(popupId, request, name));
    }

    // 조회: 관리자 전체, 주최자는 본인 것만
    @GetMapping("/api/popups/{popupId}/contract")
    public ResponseEntity<?> getContract(@PathVariable Long popupId, Authentication authentication) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(popupContractService.getContract(popupId, name, isAdmin));
    }

    // 단계 변경 (관리자 또는 본인 주최자)
    @PatchMapping("/api/popups/{popupId}/contract/stage")
    public ResponseEntity<?> updateStage(@PathVariable Long popupId,
                                         Authentication authentication,
                                         @Valid @RequestBody ContractStageUpdateRequest request) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(popupContractService.updateStage(popupId, name, isAdmin, request));
    }

}