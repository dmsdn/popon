package popupteam.popupbackend.domain.banner;

import popupteam.popupbackend.common.image.ImageProcessingService;
import popupteam.popupbackend.common.storage.FileStorageService;
import popupteam.popupbackend.domain.banner.dto.BannerResponse;
import lombok.RequiredArgsConstructor;
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