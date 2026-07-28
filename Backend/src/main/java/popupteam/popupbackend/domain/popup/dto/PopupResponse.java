package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import popupteam.popupbackend.domain.popup.Popup;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Builder
public class PopupResponse {
    private Long id;
    private Long businessId;
    private String companyName;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
    private String rejectReason;
    private LocalDateTime createdAt;
    private Double areaSqm;
    private Integer recommendedCapacity;
    private Integer capacity;
    private String reservationMode;
    private Integer avgExperienceMinutes;
    private Double latitude;
    private Double longitude;
    private String queueMode;
    private LocalDateTime statusChangedAt;
    private String adminEditNote;
    private Integer maxPartySizePerTeam;
    private List<String> hashtags;
    private java.math.BigDecimal avgRating;
    private Long reviewCount;
    private String notice;
    private List<String> keywordNames; // 이 팝업이 연결된 표준 카테고리 이름들 (예: ["패션", "라이프스타일"])
    private String businessProfileImage;
    private List<String> thumbnailImages;
    private List<String> detailImages;

    public static PopupResponse from(Popup popup) {
        return from(popup, java.util.Collections.emptyList());
    }

    public static PopupResponse from(Popup popup, List<String> hashtags) {
        return from(popup, hashtags, null, 0L, java.util.Collections.emptyList());
    }

    // 목록/검색·등록·수정용 - 이미지는 N+1 방지를 위해 안 채운다
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     java.math.BigDecimal avgRating, Long reviewCount, List<String> keywordNames) {
        return from(popup, hashtags, avgRating, reviewCount, keywordNames,
                java.util.Collections.emptyList(), java.util.Collections.emptyList());
    }

    // 상세조회(findById)용 - 키워드·이미지 목록까지 한 번에 채워서 리턴
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     java.math.BigDecimal avgRating, Long reviewCount,
                                     List<String> keywordNames,
                                     List<String> thumbnailImages, List<String> detailImages) {
        return PopupResponse.builder()
                .id(popup.getId())
                .businessId(popup.getBusiness().getId())
                .companyName(popup.getBusiness().getCompanyName())
                .businessProfileImage(popup.getBusiness().getProfileImage())
                .title(popup.getTitle())
                .description(popup.getDescription())
                .location(popup.getLocation())
                .startDate(popup.getStartDate())
                .endDate(popup.getEndDate())
                .status(popup.getStatus().name())
                .rejectReason(popup.getRejectReason())
                .createdAt(popup.getCreatedAt())
                .areaSqm(popup.getAreaSqm())
                .recommendedCapacity(popup.getRecommendedCapacity())
                .capacity(popup.getCapacity())
                .reservationMode(popup.getReservationMode() != null ? popup.getReservationMode().name() : null)
                .avgExperienceMinutes(popup.getAvgExperienceMinutes())
                .latitude(popup.getLatitude())
                .longitude(popup.getLongitude())
                .queueMode(popup.getQueueMode() != null ? popup.getQueueMode().name() : null)
                .statusChangedAt(popup.getStatusChangedAt())
                .adminEditNote(popup.getAdminEditNote())
                .maxPartySizePerTeam(popup.getMaxPartySizePerTeam())
                .hashtags(hashtags)
                .keywordNames(keywordNames)
                .avgRating(avgRating != null ? avgRating.setScale(1, java.math.RoundingMode.HALF_UP) : null)
                .reviewCount(reviewCount)
                .notice(popup.getNotice())
                .thumbnailImages(thumbnailImages)
                .detailImages(detailImages)
                .build();
    }
}