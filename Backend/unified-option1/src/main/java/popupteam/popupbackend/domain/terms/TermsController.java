package popupteam.popupbackend.domain.terms;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.terms.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class TermsController {

    private final TermsRepository termsRepository;

    // 공개: 약관 상세보기 (프론트의 "약관 보기" 버튼에서 호출)
    @GetMapping("/api/terms")
    public ResponseEntity<TermsResponse> getTerms() {
        Terms terms = termsRepository.findById(1L)
                .orElseThrow(() -> new IllegalArgumentException("등록된 약관이 없습니다."));
        return ResponseEntity.ok(TermsResponse.from(terms));
    }

    // 관리자: 약관 수정
    @PutMapping("/api/admin/terms")
    public ResponseEntity<TermsResponse> updateTerms(Authentication authentication,
                                                     @Valid @RequestBody TermsUpdateRequest request) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 약관을 수정할 수 있습니다.");
        }

        Terms terms = termsRepository.findById(1L)
                .orElseThrow(() -> new IllegalArgumentException("등록된 약관이 없습니다."));

        terms.setTitle(request.getTitle());
        terms.setContent(request.getContent());
        terms.setUpdatedAt(java.time.LocalDateTime.now());

        return ResponseEntity.ok(TermsResponse.from(termsRepository.save(terms)));
    }
}