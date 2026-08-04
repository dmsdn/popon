package popupteam.popupbackend.domain.banner;

import popupteam.popupbackend.common.image.ImageProcessingService;
import popupteam.popupbackend.common.storage.FileStorageService;
import popupteam.popupbackend.domain.banner.dto.BannerEligiblePopupResponse;
import popupteam.popupbackend.domain.banner.dto.BannerResponse;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupImage;
import popupteam.popupbackend.domain.popup.PopupImageRepository;
import popupteam.popupbackend.domain.popup.PopupImageType;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.popup.PopupStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerRepository bannerRepository;
    private final ImageProcessingService imageProcessingService;
    private final FileStorageService fileStorageService;
    private final PopupRepository popupRepository;
    private final PopupImageRepository popupImageRepository;

    // 소비자 프론트엔드 팝업 상세페이지 base url. 배너가 팝업 상세로 바로 연결되도록 자동으로 이 뒤에 /popup/{id}를 붙인다.
    @Value("${app.customer-base-url}")
    private String customerBaseUrl;

    public BannerResponse create(String title, String linkUrl, Integer sortOrder,
                                 LocalDateTime startDate, LocalDateTime endDate,
                                 MultipartFile file) {
        byte[] resized = imageProcessingService.resizeToJpeg(file, 1080, 1440, 0.88f);
        String imageUrl = fileStorageService.storeBytes(resized, ".jpg");

        Banner banner = new Banner();
        banner.setTitle(title);
        banner.setImageUrl(imageUrl);
        banner.setLinkUrl(linkUrl);
        banner.setSortOrder(sortOrder != null ? sortOrder : 0);
        banner.setStartDate(startDate);
        banner.setEndDate(endDate);
        banner.setActive(true);

        return BannerResponse.from(bannerRepository.save(banner));
    }

    public BannerResponse update(Long id, String title, String linkUrl, Integer sortOrder,
                                 LocalDateTime startDate, LocalDateTime endDate,
                                 Boolean active, MultipartFile file) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 배너입니다."));

        if (title != null) banner.setTitle(title);
        if (linkUrl != null) banner.setLinkUrl(linkUrl);
        if (sortOrder != null) banner.setSortOrder(sortOrder);
        if (startDate != null) banner.setStartDate(startDate);
        if (endDate != null) banner.setEndDate(endDate);
        if (active != null) banner.setActive(active);

        if (file != null && !file.isEmpty()) {
            byte[] resized = imageProcessingService.resizeToJpeg(file, 1080, 1440, 0.88f);
            banner.setImageUrl(fileStorageService.storeBytes(resized, ".jpg"));
        }

        return BannerResponse.from(bannerRepository.save(banner));
    }

    // 배너 등록 화면에서 고를 수 있는 팝업 후보 목록 - 진행중(OPEN) + 오픈예정(BEFOR)만
    public List<BannerEligiblePopupResponse> getEligiblePopups() {
        List<Popup> popups = popupRepository.findByStatusInOrderByCreatedAtDesc(
                List.of(PopupStatus.OPEN, PopupStatus.BEFOR));

        List<Long> popupIds = popups.stream().map(Popup::getId).toList();
        List<PopupImage> thumbnails = popupImageRepository
                .findByPopupIdInAndTypeOrderBySortOrder(popupIds, PopupImageType.THUMBNAIL);

        java.util.Map<Long, String> thumbnailByPopupId = new java.util.HashMap<>();
        for (PopupImage img : thumbnails) {
            thumbnailByPopupId.putIfAbsent(img.getPopup().getId(), img.getImageUrl());
        }

        return popups.stream()
                .map(p -> BannerEligiblePopupResponse.of(p, thumbnailByPopupId.get(p.getId())))
                .toList();
    }

    // 관리자가 "진행중/오픈예정 팝업 목록"에서 팝업을 선택해서 배너로 올리는 기능
    // 제목은 관리자가 직접 입력하고, 이미지(대표 썸네일)와 클릭 시 이동할 상세페이지 링크는 팝업에서 자동으로 채운다.
    public BannerResponse createFromPopup(Long popupId, String title, Integer sortOrder) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        List<PopupImage> thumbnails = popupImageRepository
                .findByPopupIdAndTypeOrderBySortOrder(popupId, PopupImageType.THUMBNAIL);
        if (thumbnails.isEmpty()) {
            throw new IllegalArgumentException("이 팝업은 대표(썸네일) 이미지가 없어 배너로 만들 수 없습니다. 팝업에 썸네일을 먼저 등록해주세요.");
        }

        Banner banner = new Banner();
        banner.setTitle(title);
        banner.setImageUrl(thumbnails.get(0).getImageUrl());
        banner.setLinkUrl(customerBaseUrl + "/popup/" + popupId);
        banner.setPopupId(popupId);
        banner.setSortOrder(sortOrder != null ? sortOrder : bannerRepository.findMaxSortOrder() + 1);
        banner.setActive(true);

        return BannerResponse.from(bannerRepository.save(banner));
    }

    // 배너 노출 순서 일괄 변경. bannerIds에 담긴 순서 그대로 0,1,2...로 sortOrder를 다시 매긴다.
    public List<BannerResponse> reorder(List<Long> bannerIds) {
        List<Banner> banners = bannerRepository.findAllById(bannerIds);
        if (banners.size() != bannerIds.size()) {
            throw new IllegalArgumentException("존재하지 않는 배너 id가 포함되어 있습니다.");
        }

        java.util.Map<Long, Banner> byId = new java.util.HashMap<>();
        for (Banner b : banners) {
            byId.put(b.getId(), b);
        }

        for (int i = 0; i < bannerIds.size(); i++) {
            byId.get(bannerIds.get(i)).setSortOrder(i);
        }
        bannerRepository.saveAll(banners);

        return getAll();
    }

    public void delete(Long id) {
        if (!bannerRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 배너입니다.");
        }
        bannerRepository.deleteById(id);
    }

    public List<BannerResponse> getAll() {
        return bannerRepository.findAllByOrderBySortOrderAsc().stream()
                .map(BannerResponse::from)
                .toList();
    }

    public List<BannerResponse> getActiveBanners() {
        return bannerRepository.findActiveBanners(LocalDateTime.now()).stream()
                .map(BannerResponse::from)
                .toList();
    }
}