package com.popupplatform.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerUpdateRequest {
    private String nickname;
    private String profileImage;
}