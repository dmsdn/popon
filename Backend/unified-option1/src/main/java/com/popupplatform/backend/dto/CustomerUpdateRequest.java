package com.popupplatform.backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
public class CustomerUpdateRequest {
    private String nickname;
    private String profileImage;
    private LocalDate birthDate;
    private String gender;  // "MALE", "FEMALE", "UNKNOWN"
}