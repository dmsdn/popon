package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/keywords")
@RequiredArgsConstructor
public class KeywordController {

    private final KeywordRepository keywordRepository;

    // 관리자가 추가/삭제로 관리하는 목록을 그대로 노출. 로그인 여부와 무관하게 열어둠.
    // HashMap(LinkedHashMap) 사용 - Map.of는 null을 못 담는데, 아이콘 미등록 카테고리는 iconUrl이 null이라 터짐.
    @GetMapping
    public List<Map<String, Object>> getKeywords() {
        return keywordRepository.findAll().stream()
                .map(k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", k.getId());
                    m.put("name", k.getName());
                    m.put("iconUrl", k.getIconUrl());
                    return m;
                })
                .toList();
    }
}