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

    public PopupResponse create(Long businessId, PopupCreateRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        Popup popup = new Popup();
        popup.setBusiness(business);
        popup.setTitle(request.getTitle());
        popup.setDescription(request.getDescription());
        popup.setLocation(request.getLocation());
        popup.setStartDate(request.getStartDate());
        popup.setEndDate(request.getEndDate());
        popup.setStatus(PopupStatus.PENDING);

        return PopupResponse.from(popupRepository.save(popup));
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
        return PopupResponse.from(popup);
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
        popup.setUpdatedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    public void delete(Long id, Long businessId) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 삭제할 수 있습니다.");
        }

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
        popup.setUpdatedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    public PopupResponse reject(Long popupId, String reason) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        popup.setStatus(PopupStatus.REJECTED);
        popup.setRejectReason(reason);
        popup.setUpdatedAt(java.time.LocalDateTime.now());

        return PopupResponse.from(popupRepository.save(popup));
    }

    public List<PopupResponse> getMyPopups(Long businessId) {
        return popupRepository.findByBusinessIdOrderByCreatedAtDesc(businessId).stream()
                .map(PopupResponse::from)
                .collect(Collectors.toList());
    }
}