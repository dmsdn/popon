package popupteam.popupbackend.domain.admin;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.consumer.CustomerKeywordRepository;
import popupteam.popupbackend.domain.consumer.Keyword;
import popupteam.popupbackend.domain.consumer.KeywordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 관리자가 관심 키워드(관심 카테고리: 패션/뷰티/F&B/캐릭터/라이프스타일/아트/테크 등)를
 * 직접 추가/삭제하는 API. 소비자용 GET /api/keywords(KeywordController)가 여기서 관리한 목록을 보여줌.
 */
@RestController
@RequestMapping("/api/admin/keywords")
@RequiredArgsConstructor
public class AdminKeywordController {

    private final KeywordRepository keywordRepository;
    private final CustomerKeywordRepository customerKeywordRepository;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 관리자용 전체 목록 (몇 명이 골랐는지 개수 포함)
    @GetMapping
    public List<Map<String, Object>> list(Authentication authentication) {
        requireAdmin(authentication);
        return keywordRepository.findAll().stream()
                .map(k -> Map.<String, Object>of(
                        "id", k.getId(),
                        "name", k.getName(),
                        "customerCount", customerKeywordRepository.countByKeywordId(k.getId())
                ))
                .toList();
    }

    public static class KeywordCreateRequest {
        public String name;
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication, @RequestBody KeywordCreateRequest request) {
        requireAdmin(authentication);
        if (request.name == null || request.name.isBlank()) {
            throw new IllegalArgumentException("카테고리 이름을 입력해주세요.");
        }
        if (keywordRepository.existsByName(request.name)) {
            throw new IllegalArgumentException("이미 있는 카테고리예요.");
        }
        Keyword saved = keywordRepository.save(new Keyword(request.name));
        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "name", saved.getName()));
    }

    // 카테고리 삭제. 이미 이걸 관심키워드로 고른 소비자가 있으면, 그 매핑도 같이 정리한다.
    @DeleteMapping("/{id}")
    public Map<String, Object> delete(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        if (!keywordRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 카테고리예요.");
        }
        customerKeywordRepository.deleteByKeywordId(id);
        keywordRepository.deleteById(id);
        return Map.of("success", true);
    }
}