package popupteam.popupbackend.domain.inquiry.dto;

import lombok.*;
import popupteam.popupbackend.domain.inquiry.OrganizerInquiry;
import java.time.LocalDateTime;

@Getter @Builder
public class InquiryResponse {
    private Long id;
    private Long businessId;
    private String companyName;
    private String title;
    private String content;
    private String status;
    private String answerContent;
    private String answeredBy;
    private LocalDateTime answeredAt;
    private LocalDateTime createdAt;

    public static InquiryResponse from(OrganizerInquiry i) {
        return InquiryResponse.builder()
                .id(i.getId())
                .businessId(i.getBusiness().getId())
                .companyName(i.getBusiness().getCompanyName())
                .title(i.getTitle())
                .content(i.getContent())
                .status(i.getStatus().name())
                .answerContent(i.getAnswerContent())
                .answeredBy(i.getAnsweredBy())
                .answeredAt(i.getAnsweredAt())
                .createdAt(i.getCreatedAt())
                .build();
    }
}