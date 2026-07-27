package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/keywords")
@RequiredArgsConstructor
public class KeywordController {

    private final KeywordRepository keywordRepository;

    // 관리자가 추가/삭제로 관리하는 목록을 그대로 노출. 로그인 여부와 무관하게 열어둠.
    @GetMapping
    public List<Map<String, Object>> getKeywords() {
        return keywordRepository.findAll().stream()
                .map(k -> Map.<String, Object>of("id", k.getId(), "name", k.getName()))
                .toList();
    }
}