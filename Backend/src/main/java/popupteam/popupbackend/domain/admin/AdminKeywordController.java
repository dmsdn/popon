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

    private static final long MAX_ICON_SIZE = 2 * 1024 * 1024; // 2MB — 아이콘에 그 이상은 필요 없다

    /**
     * 카테고리 아이콘 저장 (8/4 개정) — PNG·SVG만 받고 <b>투명 배경을 살린다</b>.
     *
     * <p>그전에는 배너와 같은 resizeToJpeg를 썼는데 아이콘에는 맞지 않았다.
     * JPEG은 알파 채널이 없어 투명 배경이 흰색으로 채워지고, 소비자 앱은 다크모드가 기본이라
     * 카테고리 자리마다 흰 네모가 생긴다. 아이콘은 배경이 비어 있어야 하는 이미지다.
     *
     * <p>SVG는 ImageIO가 읽지 못하므로(래스터 디코더뿐이다) 리사이즈하지 않고 원본 그대로 저장한다.
     * 벡터라 어차피 크기를 잃지 않고, 128px로 굳힐 이유도 없다.
     *
     * <p>업로드 주체가 관리자뿐이라 SVG 안의 스크립트는 신뢰 경계 안에 있다고 본다.
     * (소비자 화면은 &lt;img&gt;로 렌더하므로 스크립트가 실행되지 않는다.)
     */
    private String storeIcon(MultipartFile icon) {
        if (icon.getSize() > MAX_ICON_SIZE) {
            throw new IllegalArgumentException("아이콘은 2MB 이하만 업로드할 수 있습니다.");
        }
        String contentType = icon.getContentType();
        String type = (contentType == null) ? "" : contentType.toLowerCase();

        if (type.startsWith("image/svg")) {
            // SVG는 ImageIO의 허용 목록(래스터 전용) 밖이라 validate를 타지 않고 여기서 바로 저장한다
            try {
                return fileStorageService.storeBytes(icon.getBytes(), ".svg");
            } catch (java.io.IOException e) {
                throw new IllegalArgumentException("아이콘 파일을 읽지 못했습니다.");
            }
        }
        if (!type.equals("image/png")) {
            throw new IllegalArgumentException("카테고리 아이콘은 PNG 또는 SVG만 등록할 수 있습니다. (투명 배경이 필요합니다)");
        }
        return fileStorageService.storeBytes(imageProcessingService.resizeToPng(icon, 128, 128), ".png");
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
            keyword.setIconUrl(storeIcon(icon));
        }

        Keyword saved = keywordRepository.save(keyword);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("iconUrl", saved.getIconUrl());
        return ResponseEntity.status(201).body(result);
    }

    // 카테고리 수정 - 이름/아이콘 중 보낸 값만 부분 수정. 팝업/찜 매핑은 그대로 유지되니
    // 이름을 비슷한 단어로 바꾸거나 아이콘만 교체하고 싶을 때 삭제 후 재등록할 필요가 없다.
    @PatchMapping(value = "/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> update(Authentication authentication,
                                       @PathVariable Long id,
                                       @RequestParam(required = false) String name,
                                       @RequestParam(required = false) MultipartFile icon) {
        requireAdmin(authentication);
        Keyword keyword = keywordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리예요."));

        if (name != null && !name.isBlank() && !name.equals(keyword.getName())) {
            if (keywordRepository.existsByName(name)) {
                throw new IllegalArgumentException("이미 있는 카테고리예요.");
            }
            keyword.setName(name);
        }

        if (icon != null && !icon.isEmpty()) {
            keyword.setIconUrl(storeIcon(icon));
        }

        Keyword saved = keywordRepository.save(keyword);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("iconUrl", saved.getIconUrl());
        return result;
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