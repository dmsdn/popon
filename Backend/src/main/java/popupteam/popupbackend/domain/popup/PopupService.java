package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.popup.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
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
    private final popupteam.popupbackend.domain.consumer.KeywordRepository keywordRepository;
    private final popupteam.popupbackend.common.image.ImageProcessingService imageProcessingService;
    private final PopupSnsLinkRepository popupSnsLinkRepository;
    private final PopupOperatingHoursRepository popupOperatingHoursRepository;


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
        popup.setNotice(request.getNotice());

        Popup saved = popupRepository.save(popup);
        List<String> hashtags = saveHashtags(saved.getId(), request.getHashtags());
        savePopupKeywords(saved.getId(), request.getKeywordIds());
        List<PopupSnsLinkResponse> snsLinks =
                replaceSnsLinks(saved, request.getSnsLinks());
        List<OperatingHoursResponse> operatingHours = saveOperatingHours(saved.getId(), request.getOperatingHours());

        return PopupResponse.from(saved, hashtags, getPopupKeywordNames(saved.getId()), snsLinks, operatingHours);
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

    // 요일별 운영시간 저장 공용 로직: 기존 거 지우고 새 목록으로 덮어씀 (null이면 손 안 대고 기존 값 그대로 반환)
    private List<OperatingHoursResponse> saveOperatingHours(Long popupId, List<OperatingHoursRequest> hours) {
        if (hours == null) {
            return popupOperatingHoursRepository.findByPopupIdOrderByDayOfWeek(popupId).stream()
                    .map(OperatingHoursResponse::from)
                    .toList();
        }
        popupOperatingHoursRepository.deleteByPopupId(popupId);
        List<OperatingHoursResponse> saved = new java.util.ArrayList<>();
        for (OperatingHoursRequest h : hours) {
            if (h.getDayOfWeek() == null || h.getDayOfWeek().isBlank()) continue;
            PopupOperatingHours entity = new PopupOperatingHours();
            entity.setPopup(popupRepository.getReferenceById(popupId));
            entity.setDayOfWeek(java.time.DayOfWeek.valueOf(h.getDayOfWeek()));
            entity.setClosed(h.isClosed());
            entity.setOpenTime(h.isClosed() ? null : h.getOpenTime());
            entity.setCloseTime(h.isClosed() ? null : h.getCloseTime());
            PopupOperatingHours savedEntity = popupOperatingHoursRepository.save(entity);
            saved.add(OperatingHoursResponse.from(savedEntity));
        }
        return saved;
    }

    public List<PopupResponse> search(String location, String status, String keyword) {
        PopupStatus statusEnum = (status != null && !status.isBlank())
                ? PopupStatus.valueOf(status)
                : null;

        String locationParam = (location != null && !location.isBlank()) ? location : null;
        String keywordParam = (keyword != null && !keyword.isBlank()) ? keyword : null;

        List<Popup> popups = popupRepository.search(locationParam, statusEnum, keywordParam);
        return enrichForList(popups);
    }

    public PopupResponse findById(Long id) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));
        List<String> hashtags = popupHashtagRepository.findByPopupIdOrderBySortOrderAsc(id).stream()
                .map(PopupHashtag::getTag)
                .collect(Collectors.toList());
        java.math.BigDecimal avgRating = reviewRepository.findAverageRatingByPopupId(id);
        long reviewCount = reviewRepository.countByPopupId(id);
        List<String> thumbnailImages = popupImageRepository.findByPopupIdAndTypeOrderBySortOrder(id, PopupImageType.THUMBNAIL)
                .stream().map(PopupImage::getImageUrl).toList();
        List<String> detailImages = popupImageRepository.findByPopupIdAndTypeOrderBySortOrder(id, PopupImageType.DETAIL)
                .stream().map(PopupImage::getImageUrl).toList();
        List<PopupSnsLinkResponse> snsLinks = getSnsLinks(id);
        List<OperatingHoursResponse> operatingHours = popupOperatingHoursRepository
                .findByPopupIdOrderByDayOfWeek(id).stream()
                .map(OperatingHoursResponse::from)
                .toList();
        return PopupResponse.fromDetail(popup, hashtags, avgRating, reviewCount,
                getPopupKeywordNames(id), snsLinks, thumbnailImages, detailImages, operatingHours);
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
        if (request.getNotice() != null) {
            popup.setNotice(request.getNotice());
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
        List<PopupSnsLinkResponse> snsLinks;

        if (request.getSnsLinks() != null) {
            snsLinks = replaceSnsLinks(saved, request.getSnsLinks());
        } else {
            snsLinks = getSnsLinks(id);
        }

        List<OperatingHoursResponse> operatingHours = saveOperatingHours(id, request.getOperatingHours());

        return PopupResponse.from(saved, hashtags, getPopupKeywordNames(id), snsLinks, operatingHours);
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
        popupSnsLinkRepository.deleteByPopup_Id(id);
        popupOperatingHoursRepository.deleteByPopupId(id);

        popupRepository.delete(popup);
    }

    // 팝업 이미지 업로드 - 썸네일(목록/카드용, 정사각형) / 상세(본문용, 세로형) 구분해서 리사이즈
    public PopupImageResponse uploadImage(Long popupId, Long businessId, org.springframework.web.multipart.MultipartFile file,
                                          PopupImageType type) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업에만 이미지를 추가할 수 있습니다.");
        }

        byte[] resized = (type == PopupImageType.DETAIL)
                ? imageProcessingService.resizeToJpeg(file, 1080, 1440, 0.88f)   // 상세 이미지: 세로형, 쿠팡 상세페이지 이미지 비율
                : imageProcessingService.resizeToJpeg(file, 800, 800, 0.85f);     // 썸네일: 정사각형 카드용

        String imageUrl = fileStorageService.storeBytes(resized, ".jpg");

        int nextOrder = popupImageRepository.findMaxSortOrder(popupId, type) + 1;

        PopupImage image = new PopupImage();
        image.setPopup(popup);
        image.setImageUrl(imageUrl);
        image.setType(type);
        image.setSortOrder(nextOrder);

        PopupImage saved = popupImageRepository.save(image);
        return PopupImageResponse.from(saved);
    }

    // 팝업 이미지 목록 조회 (type 안 주면 전체, 소비자/주최자/관리자 다 조회 가능 - 인증 불필요)
    public List<PopupImageResponse> getImages(Long popupId, PopupImageType type) {
        List<PopupImage> images = (type != null)
                ? popupImageRepository.findByPopupIdAndTypeOrderBySortOrder(popupId, type)
                : popupImageRepository.findByPopupIdOrderBySortOrder(popupId);

        return images.stream().map(PopupImageResponse::from).toList();
    }

    // 팝업 이미지 삭제 - 본인이 등록한 팝업만 가능
    public void deleteImage(Long popupId, Long imageId, Long businessId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업의 이미지만 삭제할 수 있습니다.");
        }

        PopupImage image = popupImageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이미지입니다."));

        if (!image.getPopup().getId().equals(popupId)) {
            throw new IllegalArgumentException("해당 팝업의 이미지가 아닙니다.");
        }

        popupImageRepository.delete(image);
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

    // 프론트 localStorage에 저장된 "최근 본 팝업" ID 목록으로 최신 상태 조회
    // (localStorage 스냅샷이 아니라 DB 최신 데이터를 내려줘서 게시중지 등 반영되도록)
    public List<PopupResponse> getByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Popup> popups = popupRepository.findAllByIdWithBusiness(ids);

        // 요청한 ids 순서 그대로 유지 (최근 본 순서 = 최근순 정렬이라서 순서 유지가 중요)
        java.util.Map<Long, Popup> popupMap = popups.stream()
                .collect(Collectors.toMap(Popup::getId, p -> p));
        List<Popup> ordered = ids.stream()
                .map(popupMap::get)
                .filter(java.util.Objects::nonNull) // 삭제된 팝업 등은 자동으로 걸러짐
                .toList();

        return enrichForList(ordered);
    }

    public List<PopupResponse> getMyPopups(Long businessId) {
        List<Popup> popups = popupRepository.findByBusinessIdWithRegion(businessId);
        return enrichForList(popups);
    }

    // 곧 오픈하는 팝업 (BEFOR 상태 중 시작일 가까운 순)
    public List<PopupResponse> getUpcomingPopups(int limit) {
        List<Popup> popups = popupRepository.findByStatus(PopupStatus.BEFOR).stream()
                .sorted(java.util.Comparator.comparing(Popup::getStartDate))
                .limit(limit)
                .toList();
        return enrichForList(popups);
    }

    // 비슷한 팝업 추천 (해시태그 겹침 +2점/개, 같은 지역 +1점, 점수순 정렬 / 부족하면 최근 팝업으로 채움)
    public List<PopupResponse> getSimilarPopups(Long id, int limit) {
        Popup base = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        List<String> baseTags = popupHashtagRepository.findByPopupIdOrderBySortOrderAsc(id).stream()
                .map(PopupHashtag::getTag)
                .toList();

        List<PopupStatus> visibleStatuses = List.of(PopupStatus.BEFOR, PopupStatus.OPEN, PopupStatus.CLOSED);

        java.util.Map<Long, Integer> scoreMap = new java.util.HashMap<>();

        // 해시태그 겹침: 매칭된 태그 1개당 +2점
        if (!baseTags.isEmpty()) {
            popupHashtagRepository.findByTagInAndPopupIdNot(baseTags, id)
                    .forEach(ph -> scoreMap.merge(ph.getPopupId(), 2, Integer::sum));
        }

        // 같은 지역: +1점
        if (base.getLocation() != null && !base.getLocation().isBlank()) {
            popupRepository.findByLocationAndStatusInAndIdNot(base.getLocation(), visibleStatuses, id)
                    .forEach(p -> scoreMap.merge(p.getId(), 1, Integer::sum));
        }

        List<Popup> ranked = new java.util.ArrayList<>();
        if (!scoreMap.isEmpty()) {
            java.util.Map<Long, Popup> popupMap = popupRepository
                    .findAllByIdWithBusiness(new java.util.ArrayList<>(scoreMap.keySet())).stream()
                    .filter(p -> visibleStatuses.contains(p.getStatus()))
                    .collect(Collectors.toMap(Popup::getId, p -> p));

            ranked = popupMap.values().stream()
                    .sorted((a, b) -> {
                        int scoreCompare = scoreMap.getOrDefault(b.getId(), 0) - scoreMap.getOrDefault(a.getId(), 0);
                        if (scoreCompare != 0) return scoreCompare;
                        return a.getStartDate().compareTo(b.getStartDate());
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
        }

        java.util.Set<Long> excludeIds = ranked.stream().map(Popup::getId).collect(Collectors.toSet());
        excludeIds.add(id);

        // 유사 팝업이 limit보다 부족하면 최근 오픈예정/진행중 팝업으로 채움 (빈 화면 방지)
        List<Popup> combined = new java.util.ArrayList<>(ranked);
        if (combined.size() < limit) {
            List<Popup> fillCandidates = new java.util.ArrayList<>();
            fillCandidates.addAll(popupRepository.findByStatus(PopupStatus.OPEN));
            fillCandidates.addAll(popupRepository.findByStatus(PopupStatus.BEFOR));

            List<Popup> filler = fillCandidates.stream()
                    .filter(p -> !excludeIds.contains(p.getId()))
                    .sorted(java.util.Comparator.comparing(Popup::getCreatedAt).reversed())
                    .limit(limit - combined.size())
                    .toList();

            combined.addAll(filler);
        }

        return enrichForList(combined);
    }

    // 선택한 지역(addressKeyword)을 팝업에 저장. 주소와의 일치 여부는 검증하지 않음.
    private void applyAddressKeyword(Popup popup, Long addressKeywordId, String location) {
        popupteam.popupbackend.domain.consumer.Region region = regionRepository.findById(addressKeywordId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지역입니다."));

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

    // 팝업이 가진 표준 키워드 "이름" 목록 조회 (PopupResponse용, 단건 - create/update/findById에서 사용)
    private List<String> getPopupKeywordNames(Long popupId) {
        List<Long> keywordIds = getPopupKeywordIds(popupId);
        if (keywordIds.isEmpty()) return List.of();
        return keywordRepository.findAllById(keywordIds).stream()
                .map(popupteam.popupbackend.domain.consumer.Keyword::getName)
                .collect(Collectors.toList());
    }

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

        List<Popup> popups = popupRepository.findAllByIdWithBusiness(popupIds);
        return enrichForList(popups);
    }

    // 목록/검색 화면 공용 배치 조회 - 해시태그·표준키워드이름·썸네일을 팝업별 개별쿼리 없이 한 번씩만 조회해서 조립
    private List<PopupResponse> enrichForList(List<Popup> popups) {
        if (popups.isEmpty()) return List.of();

        List<Long> ids = popups.stream().map(Popup::getId).toList();

        java.util.Map<Long, List<String>> hashtagsByPopup = popupHashtagRepository
                .findByPopupIdInOrderBySortOrderAsc(ids).stream()
                .collect(Collectors.groupingBy(PopupHashtag::getPopupId,
                        Collectors.mapping(PopupHashtag::getTag, Collectors.toList())));

        List<PopupKeyword> popupKeywords = popupKeywordRepository.findByPopupIdIn(ids);
        java.util.Set<Long> keywordIds = popupKeywords.stream()
                .map(PopupKeyword::getKeywordId).collect(Collectors.toSet());
        java.util.Map<Long, String> keywordNameById = keywordIds.isEmpty()
                ? java.util.Map.of()
                : keywordRepository.findAllById(keywordIds).stream()
                .collect(Collectors.toMap(
                        popupteam.popupbackend.domain.consumer.Keyword::getId,
                        popupteam.popupbackend.domain.consumer.Keyword::getName));
        java.util.Map<Long, List<String>> keywordNamesByPopup = popupKeywords.stream()
                .collect(Collectors.groupingBy(PopupKeyword::getPopupId,
                        Collectors.mapping(pk -> keywordNameById.get(pk.getKeywordId()), Collectors.toList())));

        java.util.Map<Long, List<String>> thumbnailsByPopup = popupImageRepository
                .findByPopupIdInAndTypeOrderBySortOrder(ids, PopupImageType.THUMBNAIL).stream()
                .collect(Collectors.groupingBy(img -> img.getPopup().getId(),
                        Collectors.mapping(PopupImage::getImageUrl, Collectors.toList())));

        return popups.stream()
                .map(popup -> {
                    Long popupId = popup.getId();
                    return PopupResponse.fromForList(popup,
                            hashtagsByPopup.getOrDefault(popupId, List.of()),
                            keywordNamesByPopup.getOrDefault(popupId, List.of()),
                            thumbnailsByPopup.getOrDefault(popupId, List.of()));
                })
                .toList();
    }

    private List<PopupSnsLinkResponse> replaceSnsLinks(
            Popup popup,
            List<PopupSnsLinkRequest> requests
    ) {
        popupSnsLinkRepository.deleteByPopup_Id(popup.getId());

        if (requests == null || requests.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        int defaultOrder = 0;

        for (PopupSnsLinkRequest request : requests) {
            if (request == null) {
                continue;
            }

            PopupSnsLink link = new PopupSnsLink();
            link.setPopup(popup);
            link.setPlatform(request.getPlatform());
            link.setUrl(request.getUrl().trim());

            if (request.getDisplayName() != null
                    && !request.getDisplayName().isBlank()) {
                link.setDisplayName(request.getDisplayName().trim());
            }

            link.setSortOrder(
                    request.getSortOrder() != null
                            ? request.getSortOrder()
                            : defaultOrder
            );

            popupSnsLinkRepository.save(link);
            defaultOrder++;
        }

        return getSnsLinks(popup.getId());
    }

    private List<PopupSnsLinkResponse> getSnsLinks(Long popupId) {
        return popupSnsLinkRepository
                .findByPopup_IdOrderBySortOrderAscIdAsc(popupId)
                .stream()
                .map(PopupSnsLinkResponse::from)
                .toList();
    }

}