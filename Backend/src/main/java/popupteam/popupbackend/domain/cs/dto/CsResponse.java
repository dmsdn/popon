package popupteam.popupbackend.domain.cs.dto;

import lombok.*;
import popupteam.popupbackend.domain.cs.CsRequest;
import java.time.LocalDateTime;

@Getter @Builder
public class CsResponse {
    private Long id;
    private Long customerId;
    private String customerNickname;
    private String title;
    private String content;
    private String status;
    private String answerContent;
    private String answeredBy;
    private LocalDateTime answeredAt;
    private LocalDateTime createdAt;

    public static CsResponse from(CsRequest c) {
        return CsResponse.builder()
                .id(c.getId())
                .customerId(c.getCustomer().getId())
                .customerNickname(c.getCustomer().getNickname())
                .title(c.getTitle())
                .content(c.getContent())
                .status(c.getStatus().name())
                .answerContent(c.getAnswerContent())
                .answeredBy(c.getAnsweredBy())
                .answeredAt(c.getAnsweredAt())
                .createdAt(c.getCreatedAt())
                .build();
    }
}