package popupteam.popupbackend.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.admin.Admin;
import java.time.LocalDateTime;

@Getter
@Builder
public class AdminListResponse {
    private Long id;
    private String email;
    private String name;
    private LocalDateTime createdAt;

    public static AdminListResponse from(Admin admin) {
        return AdminListResponse.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .name(admin.getName())
                .createdAt(admin.getCreatedAt())
                .build();
    }
}