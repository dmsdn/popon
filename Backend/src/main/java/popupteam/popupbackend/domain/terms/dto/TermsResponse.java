package popupteam.popupbackend.domain.terms.dto;

import lombok.*;
import popupteam.popupbackend.domain.terms.Terms;
import java.time.LocalDateTime;

@Getter @Builder
public class TermsResponse {
    private Long id;
    private String title;
    private String content;
    private LocalDateTime updatedAt;

    public static TermsResponse from(Terms t) {
        return TermsResponse.builder()
                .id(t.getId())
                .title(t.getTitle())
                .content(t.getContent())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}