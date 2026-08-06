package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.PopularPopupResponse;
import popupteam.popupbackend.domain.review.ReviewRepository;
import popupteam.popupbackend.domain.wishlist.PopupWishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PopupPopularityService {

    private final PopupRepository popupRepository;
    private final PopupWishlistRepository popupWishlistRepository;
    private final ReviewRepository reviewRepository;
    private final PopupClickLogRepository popupClickLogRepository;

    // 팝업 상세페이지 진입 시 클릭 로그 기록
    public void logClick(Long popupId, Long customerId) {
        PopupClickLog log = new PopupClickLog();
        log.setPopupId(popupId);
        log.setCustomerId(customerId);
        popupClickLogRepository.save(log);
    }

    // 찜 + 후기 + 클릭수 단순 합산으로 인기 팝업 랭킹 계산 (지역 필터 선택)
    public List<PopularPopupResponse> getPopularPopups(int limit, String region) {
        List<Popup> targetPopups = new ArrayList<>();
        targetPopups.addAll(popupRepository.findByStatus(PopupStatus.OPEN));
        targetPopups.addAll(popupRepository.findByStatus(PopupStatus.BEFOR));

        // 지역 필터는 주소 문자열(location)이 아니라 팝업 등록 시 선택한 정식 지역(addressKeyword)과
        // 정확히 일치하는지로 판단한다. 도로명주소엔 지역명이 안 들어가는 경우가 많아 문자열 포함
        // 검사로는 정확한 필터링이 어렵다.
        if (region != null && !region.isBlank() && !region.equals("전체")) {
            targetPopups = targetPopups.stream()
                    .filter(p -> p.getAddressKeyword() != null && region.equals(p.getAddressKeyword().getName()))
                    .toList();
        }

        Map<Long, Long> wishlistMap = toCountMap(popupWishlistRepository.countAllGroupByPopupId());
        Map<Long, Long> reviewMap = toCountMap(reviewRepository.countAllGroupByPopupId());
        Map<Long, Long> clickMap = toCountMap(popupClickLogRepository.countAllGroupByPopupId());

        return targetPopups.stream()
                .map(p -> {
                    long w = wishlistMap.getOrDefault(p.getId(), 0L);
                    long r = reviewMap.getOrDefault(p.getId(), 0L);
                    long c = clickMap.getOrDefault(p.getId(), 0L);
                    return PopularPopupResponse.builder()
                            .popupId(p.getId())
                            .title(p.getTitle())
                            .companyName(p.getBusiness().getCompanyName())
                            .wishlistCount(w)
                            .reviewCount(r)
                            .clickCount(c)
                            .totalScore(w + r + c)
                            .build();
                })
                .sorted((a, b) -> Long.compare(b.getTotalScore(), a.getTotalScore()))
                .limit(limit)
                .toList();
    }

    private Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Long) row[0], (Long) row[1]);
        }
        return map;
    }
}