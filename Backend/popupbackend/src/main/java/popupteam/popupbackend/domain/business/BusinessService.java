package popupteam.popupbackend.domain.business;

import popupteam.popupbackend.domain.business.dto.*;
import popupteam.popupbackend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import popupteam.popupbackend.domain.business.dto.BusinessUpdateRequest;
import popupteam.popupbackend.domain.business.dto.PasswordChangeRequest;

@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public Business signup(BusinessSignupRequest request) {
        if (businessRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        if (businessRepository.existsByBusinessNumber(request.getBusinessNumber())) {
            throw new IllegalArgumentException("이미 등록된 사업자번호입니다.");
        }

        Business business = new Business();
        business.setEmail(request.getEmail());
        business.setPassword(passwordEncoder.encode(request.getPassword()));
        business.setCompanyName(request.getCompanyName());
        business.setBusinessNumber(request.getBusinessNumber());
        business.setPhone(request.getPhone());

        return businessRepository.save(business);
    }

    public BusinessLoginResponse login(BusinessLoginRequest request) {
        Business business = businessRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다."));

        if (!passwordEncoder.matches(request.getPassword(), business.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다.");
        }

        String token = jwtUtil.generateToken(business.getEmail());
        return new BusinessLoginResponse(token, business.getId(), business.getCompanyName());
    }

    public Business findByEmail(String email) {
        return businessRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
    }

    public Business updateInfo(String email, BusinessUpdateRequest request) {
        Business business = findByEmail(email);

        if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            business.setCompanyName(request.getCompanyName());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            business.setPhone(request.getPhone());
        }
        business.setUpdatedAt(java.time.LocalDateTime.now());

        return businessRepository.save(business);
    }

    public void changePassword(String email, PasswordChangeRequest request) {
        Business business = findByEmail(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), business.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        business.setPassword(passwordEncoder.encode(request.getNewPassword()));
        business.setUpdatedAt(java.time.LocalDateTime.now());
        businessRepository.save(business);
    }
}