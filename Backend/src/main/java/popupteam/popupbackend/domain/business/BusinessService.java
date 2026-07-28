package popupteam.popupbackend.domain.business;

import popupteam.popupbackend.domain.business.dto.*;
import popupteam.popupbackend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessConsentRepository businessConsentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final popupteam.popupbackend.common.nts.NtsBusinessCheckService ntsBusinessCheckService;
    private final popupteam.popupbackend.common.storage.FileStorageService fileStorageService;
    private final popupteam.popupbackend.common.image.ImageProcessingService imageProcessingService;

    public Business signup(BusinessSignupRequest request) {
        if (businessRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        if (businessRepository.existsByBusinessNumber(request.getBusinessNumber())) {
            throw new IllegalArgumentException("이미 등록된 사업자번호입니다.");
        }

        var checkResult = ntsBusinessCheckService.checkStatus(request.getBusinessNumber());
        if (checkResult == popupteam.popupbackend.common.nts.NtsBusinessCheckService.CheckResult.NOT_FOUND) {
            throw new IllegalArgumentException("국세청에 등록되지 않은 사업자등록번호입니다.");
        }
        if (checkResult == popupteam.popupbackend.common.nts.NtsBusinessCheckService.CheckResult.CLOSED) {
            throw new IllegalArgumentException("폐업 처리된 사업자등록번호입니다.");
        }

        Business business = new Business();
        business.setEmail(request.getEmail());
        business.setPassword(passwordEncoder.encode(request.getPassword()));
        business.setCompanyName(request.getCompanyName());
        business.setBusinessNumber(request.getBusinessNumber());
        business.setPhone(request.getPhone());

        Business saved = businessRepository.save(business);

        // 가입 시 동의 이력 생성 (보관기간 1년)
        recordConsent(saved);

        return saved;
    }

    private void recordConsent(Business business) {
        LocalDateTime now = LocalDateTime.now();
        BusinessConsent consent = new BusinessConsent();
        consent.setBusiness(business);
        consent.setAgreedAt(now);
        consent.setExpiresAt(now.plusYears(1));
        businessConsentRepository.save(consent);
    }

    public BusinessLoginResponse login(BusinessLoginRequest request) {
        Business business = businessRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다."));

        if (!passwordEncoder.matches(request.getPassword(), business.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다.");
        }

        boolean needsReconsent = businessConsentRepository
                .findTopByBusinessIdOrderByAgreedAtDesc(business.getId())
                .map(c -> c.getExpiresAt().isBefore(LocalDateTime.now()))
                .orElse(true); // 동의 이력이 아예 없으면 재동의 필요로 처리

        String token = jwtUtil.generateToken(business.getEmail());
        return new BusinessLoginResponse(token, business.getId(), business.getCompanyName(), needsReconsent);
    }

    // 재동의 처리 (동의 만료 후 다시 체크했을 때)
    public void reconsent(String email) {
        Business business = findByEmail(email);
        recordConsent(business);
    }

    public Business findByEmail(String email) {
        return businessRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
    }

    public Business updateInfo(String email, popupteam.popupbackend.domain.business.dto.BusinessUpdateRequest request) {
        Business business = findByEmail(email);

        if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            business.setCompanyName(request.getCompanyName());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            business.setPhone(request.getPhone());
        }
        business.setUpdatedAt(LocalDateTime.now());

        return businessRepository.save(business);
    }

    public void changePassword(String email, popupteam.popupbackend.domain.business.dto.PasswordChangeRequest request) {
        Business business = findByEmail(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), business.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        business.setPassword(passwordEncoder.encode(request.getNewPassword()));
        business.setUpdatedAt(LocalDateTime.now());
        businessRepository.save(business);
    }

    // 대표 브랜드 이미지 (프로필) 등록/교체 - 정사각형 500x500으로 통일
    public Business updateProfileImage(String email, org.springframework.web.multipart.MultipartFile file) {
        Business business = findByEmail(email);

        byte[] resized = imageProcessingService.resizeToJpeg(file, 500, 500, 0.85f);
        String imageUrl = fileStorageService.storeBytes(resized, ".jpg");

        business.setProfileImage(imageUrl);
        business.setUpdatedAt(LocalDateTime.now());
        return businessRepository.save(business);
    }
}