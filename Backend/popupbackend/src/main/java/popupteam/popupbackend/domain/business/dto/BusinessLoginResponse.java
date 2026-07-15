// BusinessLoginResponse.java
package popupteam.popupbackend.domain.business.dto;
import lombok.*;

@Getter @AllArgsConstructor
public class BusinessLoginResponse {
    private String accessToken;
    private Long businessId;
    private String companyName;
}