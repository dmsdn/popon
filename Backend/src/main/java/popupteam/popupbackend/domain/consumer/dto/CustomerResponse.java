package popupteam.popupbackend.domain.consumer.dto;

import popupteam.popupbackend.domain.consumer.Customer;
import lombok.Getter;
import java.time.LocalDate;

@Getter
public class CustomerResponse {
    private final Long id;
    private final String nickname;
    private final String profileImage;
    private final String provider;
    private final String email;
    private final LocalDate birthDate;
    private final String gender;
    private final String phone;

    public CustomerResponse(Customer customer) {
        this.id = customer.getId();
        this.nickname = customer.getNickname();
        this.profileImage = customer.getProfileImage();
        this.provider = customer.getProvider().name();
        this.email = customer.getEmail();
        this.birthDate = customer.getBirthDate();
        this.gender = customer.getGender().name();
        this.phone = customer.getPhone();
    }
}