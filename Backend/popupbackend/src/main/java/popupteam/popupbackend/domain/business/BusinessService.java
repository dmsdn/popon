package popupteam.popupbackend.domain.business;

import popupteam.popupbackend.domain.business.dto.*;
import popupteam.popupbackend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
}