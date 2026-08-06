package popupteam.popupbackend.domain.terms;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.terms.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

// [프론트 폐지, 8/3] 원래는 관리자가 이 API로 약관 본문(제목/내용)을 DB에서 수정하고,
// 소비자/주최자 앱이 GET /api/terms로 그 내용을 불러와 보여주는 구조였음.
// 그런데 관리자 쪽 "약관 관리" 화면이 8/3에 통째로 빠지면서, 약관 텍스트를
// 각 프론트엔드(TermsModal.tsx)에 직접 하드코딩하는 방식으로 대체됨.
// 그 결과 이 컨트롤러(GET/PUT 둘 다)는 코드는 살아있지만 실제로 호출하는 곳이 없음.


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