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
    private List<String> keywordNames; // 이 팝업이 연결된 표준 카테고리 이름들 (예: ["패션", "라이프스타일"])

    public static PopupResponse from(Popup popup) {
        return from(popup, java.util.Collections.emptyList(), java.util.Collections.emptyList());
    }

    public static PopupResponse from(Popup popup, List<String> hashtags) {
        return from(popup, hashtags, java.util.Collections.emptyList());
    }

    public static PopupResponse from(Popup popup, List<String> hashtags, List<String> keywordNames) {
        return PopupResponse.builder()
                .id(popup.getId())
                .businessId(popup.getBusiness().getId())
                .companyName(popup.getBusiness().getCompanyName())
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
                .build();
    }
}