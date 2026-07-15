// BusinessLoginRequest.java
package popupteam.popupbackend.domain.business.dto;
import lombok.Getter;

@Getter
public class BusinessLoginRequest {
    private String email;
    private String password;
}