package popupteam.popupbackend.domain.popup.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.Popup;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Builder
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
    private List<String> keywordNames;
    private List<PopupSnsLinkResponse> snsLinks;

    public static PopupResponse from(Popup popup) {
        return from(
                popup,
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList()
        );
    }

    public static PopupResponse from(
            Popup popup,
            List<String> hashtags
    ) {
        return from(
                popup,
                hashtags,
                Collections.emptyList(),
                Collections.emptyList()
        );
    }

    public static PopupResponse from(
            Popup popup,
            List<String> hashtags,
            List<String> keywordNames
    ) {
        return from(
                popup,
                hashtags,
                keywordNames,
                Collections.emptyList()
        );
    }

    public static PopupResponse from(
            Popup popup,
            List<String> hashtags,
            List<String> keywordNames,
            List<PopupSnsLinkResponse> snsLinks
    ) {
        return PopupResponse.builder()
                .id(popup.getId())
                .businessId(
                        popup.getBusiness() != null
                                ? popup.getBusiness().getId()
                                : null
                )
                .companyName(
                        popup.getBusiness() != null
                                ? popup.getBusiness().getCompanyName()
                                : null
                )
                .title(popup.getTitle())
                .description(popup.getDescription())
                .location(popup.getLocation())
                .startDate(popup.getStartDate())
                .endDate(popup.getEndDate())
                .status(
                        popup.getStatus() != null
                                ? popup.getStatus().name()
                                : null
                )
                .rejectReason(popup.getRejectReason())
                .createdAt(popup.getCreatedAt())
                .areaSqm(popup.getAreaSqm())
                .recommendedCapacity(popup.getRecommendedCapacity())
                .capacity(popup.getCapacity())
                .reservationMode(
                        popup.getReservationMode() != null
                                ? popup.getReservationMode().name()
                                : null
                )
                .avgExperienceMinutes(popup.getAvgExperienceMinutes())
                .latitude(popup.getLatitude())
                .longitude(popup.getLongitude())
                .queueMode(
                        popup.getQueueMode() != null
                                ? popup.getQueueMode().name()
                                : null
                )
                .statusChangedAt(popup.getStatusChangedAt())
                .adminEditNote(popup.getAdminEditNote())
                .maxPartySizePerTeam(popup.getMaxPartySizePerTeam())
                .hashtags(
                        hashtags != null
                                ? hashtags
                                : Collections.emptyList()
                )
                .keywordNames(
                        keywordNames != null
                                ? keywordNames
                                : Collections.emptyList()
                )
                .snsLinks(
                        snsLinks != null
                                ? snsLinks
                                : Collections.emptyList()
                )
                .build();
    }
}