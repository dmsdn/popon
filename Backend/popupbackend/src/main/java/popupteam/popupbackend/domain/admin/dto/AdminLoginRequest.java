// AdminLoginRequest.java
package popupteam.popupbackend.domain.admin.dto;

import lombok.Getter;

@Getter
public class AdminLoginRequest {
    private String email;
    private String password;
}