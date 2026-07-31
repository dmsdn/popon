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
    private java.math.BigDecimal avgRating;
    private Long reviewCount;
    private String notice;
    private List<String> keywordNames; // 이 팝업이 연결된 표준 카테고리 이름들 (예: ["패션", "라이프스타일"])
    private List<PopupSnsLinkResponse> snsLinks;
    private String regionName; // 팝업이 속한 지역(address_keyword) 이름, 예: "성수"
    private String businessProfileImage;
    private List<String> thumbnailImages;
    private List<String> detailImages;
    private List<OperatingHoursResponse> operatingHours; // 요일별 운영시간·휴무일
    private String businessPhone; // 소비자가 상세페이지 > 1:1 문의에서 주최자 연락처 확인용

    public static PopupResponse from(Popup popup) {
        return from(popup, Collections.emptyList());
    }

    public static PopupResponse from(Popup popup, List<String> hashtags) {
        return from(popup, hashtags, Collections.emptyList());
    }

    // 키워드까지 (평점·SNS·이미지 미조회)
    public static PopupResponse from(Popup popup, List<String> hashtags, List<String> keywordNames) {
        return from(popup, hashtags, null, 0L, keywordNames, Collections.emptyList());
    }

    // 키워드 + SNS (평점·이미지 미조회) — 등록/수정 응답용
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     List<String> keywordNames, List<PopupSnsLinkResponse> snsLinks) {
        return from(popup, hashtags, null, 0L, keywordNames, snsLinks);
    }

    // 키워드 + SNS + 운영시간 (평점·이미지 미조회) — 등록/수정 응답용, 운영시간까지 바로 확인시켜줄 때 사용
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     List<String> keywordNames, List<PopupSnsLinkResponse> snsLinks,
                                     List<OperatingHoursResponse> operatingHours) {
        return from(popup, hashtags, null, 0L, keywordNames, snsLinks,
                Collections.emptyList(), Collections.emptyList(), operatingHours);
    }

    // 목록/검색용 — 이미지는 N+1 방지를 위해 안 채운다
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     java.math.BigDecimal avgRating, Long reviewCount,
                                     List<String> keywordNames, List<PopupSnsLinkResponse> snsLinks) {
        return from(popup, hashtags, avgRating, reviewCount, keywordNames, snsLinks,
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
    }

    // 목록/검색 화면 전용 - 해시태그·키워드명·썸네일까지 배치조회로 채워서 리턴 (평점·SNS·상세이미지는 목록에서 안 씀)
    // 이름을 from()으로 겹치게 하면 List<PopupSnsLinkResponse> 버전과 파라미터 개수·순서가 같아져서
    // 제네릭 소거(erasure) 후 시그니처가 동일해져 컴파일 에러(name clash)가 나므로 이름을 분리했다.
    public static PopupResponse fromForList(Popup popup, List<String> hashtags,
                                            List<String> keywordNames, List<String> thumbnailImages) {
        return from(popup, hashtags, null, 0L, keywordNames, Collections.emptyList(),
                thumbnailImages, Collections.emptyList(), Collections.emptyList());
    }

    // 상세조회(findById)용 — 키워드·SNS·이미지·운영시간까지 한 번에 채워서 리턴
    public static PopupResponse from(Popup popup, List<String> hashtags,
                                     java.math.BigDecimal avgRating, Long reviewCount,
                                     List<String> keywordNames, List<PopupSnsLinkResponse> snsLinks,
                                     List<String> thumbnailImages, List<String> detailImages,
                                     List<OperatingHoursResponse> operatingHours) {
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
                .businessProfileImage(
                        popup.getBusiness() != null
                                ? popup.getBusiness().getProfileImage()
                                : null
                )
                .businessPhone(
                        popup.getBusiness() != null
                                ? popup.getBusiness().getPhone()
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
                .regionName(
                        popup.getAddressKeyword() != null
                                ? popup.getAddressKeyword().getName()
                                : null
                )
                .avgRating(avgRating != null ? avgRating.setScale(1, java.math.RoundingMode.HALF_UP) : null)
                .reviewCount(reviewCount)
                .notice(popup.getNotice())
                .thumbnailImages(
                        thumbnailImages != null
                                ? thumbnailImages
                                : Collections.emptyList()
                )
                .detailImages(
                        detailImages != null
                                ? detailImages
                                : Collections.emptyList()
                )
                .operatingHours(
                        operatingHours != null
                                ? operatingHours
                                : Collections.emptyList()
                )
                .build();
    }
}