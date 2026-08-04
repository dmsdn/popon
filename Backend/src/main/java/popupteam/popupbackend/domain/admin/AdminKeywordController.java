package popupteam.popupbackend.domain.admin;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.common.image.ImageProcessingService;
import popupteam.popupbackend.common.storage.FileStorageService;
import popupteam.popupbackend.domain.consumer.CustomerKeywordRepository;
import popupteam.popupbackend.domain.consumer.Keyword;
import popupteam.popupbackend.domain.consumer.KeywordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
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
    private final popupteam.popupbackend.domain.popup.PopupKeywordRepository popupKeywordRepository;
    private final ImageProcessingService imageProcessingService;
    private final FileStorageService fileStorageService;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 관리자용 전체 목록 (몇 명이 골랐는지 개수 포함)
    // HashMap 사용 - Map.of는 iconUrl이 null인 카테고리(아이콘 미등록)에서 NPE가 나서 못 씀
    @GetMapping
    public List<Map<String, Object>> list(Authentication authentication) {
        requireAdmin(authentication);
        return keywordRepository.findAll().stream()
                .map(k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", k.getId());
                    m.put("name", k.getName());
                    m.put("iconUrl", k.getIconUrl());
                    m.put("customerCount", customerKeywordRepository.countByKeywordId(k.getId()));
                    return m;
                })
                .toList();
    }

    // 카테고리 생성. 아이콘은 선택 - 없으면 프론트가 기존 lucide 폴백 아이콘을 쓴다.
    // multipart/form-data로 바뀜 (기존엔 JSON {name}만 받았음)
    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> create(Authentication authentication,
                                     @RequestParam String name,
                                     @RequestParam(required = false) MultipartFile icon) {
        requireAdmin(authentication);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("카테고리 이름을 입력해주세요.");
        }
        if (keywordRepository.existsByName(name)) {
            throw new IllegalArgumentException("이미 있는 카테고리예요.");
        }

        Keyword keyword = new Keyword(name);
        if (icon != null && !icon.isEmpty()) {
            // 아이콘은 정사각형 소형(128x128)으로 리사이즈 - BannerService와 동일한 재사용 패턴
            byte[] resized = imageProcessingService.resizeToJpeg(icon, 128, 128, 0.9f);
            keyword.setIconUrl(fileStorageService.storeBytes(resized, ".jpg"));
        }

        Keyword saved = keywordRepository.save(keyword);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("iconUrl", saved.getIconUrl());
        return ResponseEntity.status(201).body(result);
    }

    // 카테고리 삭제. 팝업이 사용 중이어도 강제 삭제 가능 - popup_keyword 매핑을 먼저 지우고,
    // 소비자가 관심 카테고리로 찜해뒀어도 customer_keyword 매핑을 지워서 자동 해지되게 한다.
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> delete(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        if (!keywordRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 카테고리예요.");
        }
        popupKeywordRepository.deleteByKeywordId(id);
        customerKeywordRepository.deleteByKeywordId(id);
        keywordRepository.deleteById(id);
        return Map.of("success", true);
    }
}