package popupteam.popupbackend.domain.consumer.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.consumer.Customer;
import java.time.LocalDateTime;

@Getter
@Builder
public class CustomerAdminResponse {
    private Long id;
    private String email;
    private String nickname;
    private String provider;
    private LocalDateTime createdAt;
    private Boolean withdrawn;
    private Boolean suspended;

    public static CustomerAdminResponse from(Customer customer) {
        return CustomerAdminResponse.builder()
                .id(customer.getId())
                .email(customer.getEmail())
                .nickname(customer.getNickname())
                .provider(customer.getProvider() != null ? customer.getProvider().name() : null)
                .createdAt(customer.getCreatedAt())
                .withdrawn(customer.getWithdrawn())
                .suspended(customer.getSuspended())
                .build();
    }
}