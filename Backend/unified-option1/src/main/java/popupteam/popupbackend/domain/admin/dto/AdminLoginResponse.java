// AdminLoginResponse.java
package popupteam.popupbackend.domain.admin.dto;

import lombok.*;

@Getter @AllArgsConstructor
public class AdminLoginResponse {
    private String accessToken;
    private Long adminId;
    private String name;
}