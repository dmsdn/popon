package popupteam.popupbackend.domain.reservation.dto;

public class PopupVisitorCountProjection {
    private final Long popupId;
    private final String popupTitle;
    private final String companyName;
    private final Long visitorCount;

    public PopupVisitorCountProjection(Long popupId, String popupTitle, String companyName, Long visitorCount) {
        this.popupId = popupId;
        this.popupTitle = popupTitle;
        this.companyName = companyName;
        this.visitorCount = visitorCount;
    }

    public Long getPopupId() { return popupId; }
    public String getPopupTitle() { return popupTitle; }
    public String getCompanyName() { return companyName; }
    public Long getVisitorCount() { return visitorCount; }
}