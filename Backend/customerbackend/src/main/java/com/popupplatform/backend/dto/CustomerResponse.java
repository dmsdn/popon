package com.popupplatform.backend.dto;

import com.popupplatform.backend.entity.Customer;
import lombok.Getter;

@Getter
public class CustomerResponse {
    private final Long id;
    private final String nickname;
    private final String profileImage;
    private final String provider;
    private final String email;

    public CustomerResponse(Customer customer) {
        this.id = customer.getId();
        this.nickname = customer.getNickname();
        this.profileImage = customer.getProfileImage();
        this.provider = customer.getProvider().name();
        this.email = customer.getEmail();
    }
}