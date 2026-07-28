package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.popup.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PopupService {

    private final PopupRepository popupRepository;
    private final BusinessRepository businessRepository;
    private final PopupImageRepository popupImageRepository;
    private final popupteam.popupbackend.common.storage.FileStorageService fileStorageService;
    private final PopupSlotRepository popupSlotRepository;
    private final popupteam.popupbackend.domain.reservation.ReservationRepository reservationRepository;
    private final popupteam.popupbackend.common.geocoding.GeocodingService geocodingService;
    private final popupteam.popupbackend.domain.notice.NoticeService noticeService;
    private final PopupHashtagRepository popupHashtagRepository;
    private final popupteam.popupbackend.domain.consumer.RegionRepository regionRepository;
    private final PopupKeywordRepository popupKeywordRepository;
    private final popupteam.popupbackend.domain.review.ReviewRepository reviewRepository;


    public PopupResponse create(Long businessId, PopupCreateRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        Popup popup = new Popup();
        popup.setBusiness(business);
        popup.setTitle(request.getTitle());
        popup.setDescription(request.getDescription());
        popup.setLocation(request.getLocation());
        geocodingService.geocode(request.getLocation()).ifPresent(coord -> {
            popup.setLatitude(coord.latitude());
            popup.setLongitude(coord.longitude());
        });
        popup.setStartDate(request.getStartDate());
        popup.setEndDate(request.getEndDate());
        popup.setStatus(PopupStatus.PENDING);

        applyAddressKeyword(popup, request.getAddressKeywordId(), request.getLocation());

        // 면적 기반 권장 수용인원 자동계산 (면적 ÷ 4.5)
        Integer recommendedCapacity = null;
        if (request.getAreaSqm() != null) {
            recommendedCapacity = (int) Math.round(request.getAreaSqm() / 4.5);
        }
        popup.setAreaSqm(request.getAreaSqm());
        popup.setRecommendedCapacity(recommendedCapacity);

        // 최종 수용인원: 직접 입력값 우선, 없으면 추천값 사용
        Integer finalCapacity = request.getCapacity() != null ? request.getCapacity() : recommendedCapacity;
        if (finalCapacity == null) {
            throw new IllegalArgumentException("capacity 또는 areaSqm 중 하나는 반드시 입력해야 합니다.");
        }
        popup.setCapacity(finalCapacity);

        popup.setReservationMode(ReservationMode.valueOf(request.getReservationMode()));
        popup.setAvgExperienceMinutes(request.getAvgExperienceMinutes());
        popup.setQueueMode(QueueMode.valueOf(request.getQueueMode()));
        popup.setMaxPartySizePerTeam(request.getMaxPartySizePerTeam());

        Popup saved = popupRepository.save(popup);
        List<String> hashtags = saveHashtags(saved.getId(), request.getHashtags());
        savePopupKeywords(saved.getId(), request.getKeywordIds());

        return PopupResponse.from(saved, hashtags);
    }

    // 해시태그 저장 공용 로직: 기존 거 지우고 새 목록으로 덮어씀 (null이면 손 안 대고 기존 값 그대로 반환)
    private List<String> saveHashtags(Long popupId, List<String> hashtags) {
        if (hashtags == null) {
            return popupHashtagRepository.findByPopupIdOrderBySortOrderAsc(popupId).stream()
                    .map(PopupHashtag::getTag)
                    .collect(Collectors.toList());
        }
        popupHashtagRepository.deleteByPopupId(popupId);
        List<String> saved = new java.util.ArrayList<>();
        int order = 0;
        for (String tag : hashtags) {
            if (tag == null || tag.isBlank()) continue;
            popupHashtagRepository.save(new PopupHashtag(popupId, tag.trim(), order++));
            saved.add(tag.trim());
        }
        return saved;
    }

    public List<PopupResponse> search(String location, String status, String keyword) {
        PopupStatus statusEnum = (status != null && !status.isBlank())
                ? PopupStatus.valueOf(status)
                : null;

        String locationParam = (location != null && !location.isBlank()) ? location : null;
        String keywordParam = (keyword != null && !keyword.isBlank()) ? keyword : null;

        return popupRepository.search(locationParam, statusEnum, keywordParam).stream()
                .map(PopupResponse::from)
                .collect(java.util.stream.Collectors.toList());
    }

    public PopupResponse findById(Long id) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));
        List<String> hashtags = popupHashtagRepository.findByPopupIdOrderBySortOrderAsc(id).stream()
                .map(PopupHashtag::getTag)
                .collect(Collectors.toList());
        java.math.BigDecimal avgRating = reviewRepository.findAverageRatingByPopupId(id);
        long reviewCount = reviewRepository.countByPopupId(id);
        return PopupResponse.from(popup, hashtags, avgRating, reviewCount);
    }

    public PopupResponse update(Long id, Long businessId, PopupUpdateRequest request) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 수정할 수 있습니다.");
        }

        if (request.getTitle() != null) popup.setTitle(request.getTitle());
        if (request.getDescription() != null) popup.setDescription(request.getDescription());
        if (request.getLocation() != null) popup.setLocation(request.getLocation());
        if (request.getStartDate() != null) popup.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) popup.setEndDate(request.getEndDate());
        if (request.getStatus() != null) popup.setStatus(PopupStatus.valueOf(request.getStatus()));

        // 면적이 바뀌면 권장 수용인원 재계산
        if (request.getAreaSqm() != null) {
            popup.setAreaSqm(request.getAreaSqm());
            popup.setRecommendedCapacity((int) Math.round(request.getAreaSqm() / 4.5));
        }

        if (request.getCapacity() != null) {
            popup.setCapacity(request.getCapacity());
        }

        if (request.getReservationMode() != null) {
            popup.setReservationMode(ReservationMode.valueOf(request.getReservationMode()));
        }

        if (request.getAvgExperienceMinutes() != null) {
            popup.setAvgExperienceMinutes(request.getAvgExperienceMinutes());
        }

        if (request.getQueueMode() != null) {
            popup.setQueueMode(QueueMode.valueOf(request.getQueueMode()));
        }
        if (request.getMaxPartySizePerTeam() != null) {
            popup.setMaxPartySizePerTeam(request.getMaxPartySizePerTeam());
        }

        popup.setUpdatedAt(java.time.LocalDateTime.now());

        if (request.getLocation() != null) {
            geocodingService.geocode(request.getLocation()).ifPresent(coord -> {
                popup.setLatitude(coord.latitude());
                popup.setLongitude(coord.longitude());
            });
        }

        if (request.getAddressKeywordId() != null) {
            applyAddressKeyword(popup, request.getAddressKeywordId(),
                    request.getLocation() != null ? request.getLocation() : popup.getLocation());
        }

        Popup saved = popupRepository.save(popup);
        noticeService.notifyPopupUpdated(saved);
        List<String> hashtags = saveHashtags(id, request.getHashtags());
        if (request.getKeywordIds() != null) {
            savePopupKeywords(id, request.getKeywordIds());
        }

        return PopupResponse.from(saved, hashtags);
    }

    public void delete(Long id, Long businessId) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 삭제할 수 있습니다.");
        }

        // 예약이 하나라도 있으면(취소 포함) 삭제 자체를 막음
        boolean hasReservations = !reservationRepository.findByPopupId(id).isEmpty();
        if (hasReservations) {
            throw new IllegalArgumentException("예약 내역이 있는 팝업은 삭제할 수 없습니다. 예약 기록 보존을 위해 삭제가 제한됩니다.");
        }

        // 예약이 없으면 슬롯/이미지 먼저 정리 후 팝업 삭제
        popupSlotRepository.deleteAll(popupSlotRepository.findByPopupId(id));
        popupImageRepository.deleteAll(popupImageRepository.findByPopupIdOrderBySortOrder(id));
        popupHashtagRepository.deleteByPopupId(id);

        popupRepository.delete(popup);
    }

    public String uploadImage(Long popupId, Long businessId, org.springframework.web.multipart.MultipartFile file) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업에만 이미지를 추가할 수 있습니다.");
        }

        String imageUrl = fileStorageService.store(file);

        PopupImage image = new PopupImage();
        image.setPopup(popup);
        image.setImageUrl(imageUrl);

        popupImageRepository.save(image);
        return imageUrl;
    }

    public PopupResponse approve(Long popupId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        popup.setStatus(PopupStatus.BEFOR);
        popup.setRejectReason(null);
        popup.setAdminEditNote(null);
        popup.setUpdatedAt(java.time.LocalDateTime.now());
        popup.setStatusChangedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    public PopupResponse reject(Long popupId, String reason) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        popup.setStatus(PopupStatus.REJECTED);
        popup.setRejectReason(reason);
        popup.setAdminEditNote(reason);
        popup.setUpdatedAt(java.time.LocalDateTime.now());
        popup.setStatusChangedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    // 게시중지 (관리자 전용, BEFOR/OPEN 상태에서만 가능)
    public PopupResponse suspend(Long popupId, String reason) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (popup.getStatus() != PopupStatus.BEFOR && popup.getStatus() != PopupStatus.OPEN) {
            throw new IllegalArgumentException("오픈예정 또는 진행중 상태의 팝업만 게시중지할 수 있습니다.");
        }

        popup.setStatus(PopupStatus.SUSPENDED);
        popup.setAdminEditNote(reason);
        popup.setUpdatedAt(java.time.LocalDateTime.now());
        popup.setStatusChangedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    // 게시중지 해제 (재개) - 날짜 기준으로 원래 있어야 할 상태로 복원
    public PopupResponse resume(Long popupId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (popup.getStatus() != PopupStatus.SUSPENDED) {
            throw new IllegalArgumentException("게시중지 상태의 팝업만 재개할 수 있습니다.");
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        PopupStatus restoredStatus;
        if (now.isBefore(popup.getStartDate())) {
            restoredStatus = PopupStatus.BEFOR;
        } else if (now.isBefore(popup.getEndDate())) {
            restoredStatus = PopupStatus.OPEN;
        } else {
            restoredStatus = PopupStatus.CLOSED;
        }

        popup.setStatus(restoredStatus);
        popup.setAdminEditNote(null);
        popup.setUpdatedAt(now);
        popup.setStatusChangedAt(now);

        return PopupResponse.from(popupRepository.save(popup));
    }

    public List<PopupResponse> getMyPopups(Long businessId) {
        return popupRepository.findByBusinessIdOrderByCreatedAtDesc(businessId).stream()
                .map(PopupResponse::from)
                .collect(Collectors.toList());
    }

    // 곧 오픈하는 팝업 (BEFOR 상태 중 시작일 가까운 순)
    public List<PopupResponse> getUpcomingPopups(int limit) {
        return popupRepository.findByStatus(PopupStatus.BEFOR).stream()
                .sorted(java.util.Comparator.comparing(Popup::getStartDate))
                .limit(limit)
                .map(PopupResponse::from)
                .toList();
    }

    private void validateLocationMatchesRegion(String location, popupteam.popupbackend.domain.consumer.Region region) {
        if (location == null || region == null) return;
        if (!location.contains(region.getName())) {
            throw new IllegalArgumentException(
                    "입력하신 상세주소(\"" + location + "\")가 선택하신 지역(\"" + region.getName() + "\")과 일치하지 않습니다.");
        }
    }

    // location(상세주소)과 addressKeyword(선택한 지역)가 서로 맞는지 확인
    private void applyAddressKeyword(Popup popup, Long addressKeywordId, String location) {
        if (addressKeywordId == null) return;

        popupteam.popupbackend.domain.consumer.Region region = regionRepository.findById(addressKeywordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지역입니다."));

        if (location != null && !location.contains(region.getName())) {
            throw new IllegalArgumentException(
                    "입력하신 상세주소(\"" + location + "\")가 선택하신 지역(\"" + region.getName() + "\")과 일치하지 않습니다.");
        }

        popup.setAddressKeyword(region);
    }

    private void savePopupKeywords(Long popupId, java.util.List<Long> keywordIds) {
        popupKeywordRepository.deleteByPopupId(popupId);
        if (keywordIds == null) return;
        for (Long keywordId : keywordIds) {
            PopupKeyword pk = new PopupKeyword();
            pk.setPopupId(popupId);
            pk.setKeywordId(keywordId);
            popupKeywordRepository.save(pk);
        }
    }

    // 팝업이 가진 표준 키워드 ID 목록 조회
    public java.util.List<Long> getPopupKeywordIds(Long popupId) {
        return popupKeywordRepository.findByPopupId(popupId).stream()
                .map(PopupKeyword::getKeywordId)
                .toList();
    }

    // 특정 키워드를 가진 팝업 목록 (소비자 관심키워드 매칭 추천용)
    public java.util.List<PopupResponse> getPopupsByKeyword(Long keywordId) {
        java.util.List<Long> popupIds = popupKeywordRepository.findByKeywordId(keywordId).stream()
                .map(PopupKeyword::getPopupId)
                .toList();

        if (popupIds.isEmpty()) return java.util.List.of();

        return popupRepository.findAllByIdWithBusiness(popupIds).stream()
                .map(PopupResponse::from)
                .toList();
    }
}