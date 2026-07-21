package com.popupplatform.backend.dto;

import com.popupplatform.backend.entity.Customer;
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

    public CustomerResponse(Customer customer) {
        this.id = customer.getId();
        this.nickname = customer.getNickname();
        this.profileImage = customer.getProfileImage();
        this.provider = customer.getProvider().name();
        this.email = customer.getEmail();
        this.birthDate = customer.getBirthDate();
        this.gender = customer.getGender().name();
    }
}