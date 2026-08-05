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

        validateBusinessNumberOrThrow(request.getBusinessNumber());

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

    // signup()과 미리보기용 checkBusinessNumber() 둘 다 이 로직 하나로 판단 - 기준이 어긋나지 않게
    //
    // 7/31 정책 변경: 확인되지 않으면 막는다(fail-closed).
    // 그전에는 NOT_FOUND·CLOSED만 막고 SKIPPED_NO_KEY·ERROR는 통과시켰다. "지금 확인 못 하니 일단
    // 보내주고 나중에 다시 본다"는 뜻이었는데, **그 '나중'이 없었다.** 여기가 마지막 관문이다.
    // 실제로 국세청 API가 503으로 죽자(공공데이터포털 code=-5) 검증이 통째로 무력화돼
    // 존재하지 않는 사업자등록번호로 가입이 됐다.
    // 사업자 인증은 이 서비스의 신뢰 근거이므로, 확인할 수 없으면 통과시키지 않는다.
    private void validateBusinessNumberOrThrow(String businessNumber) {
        var checkResult = ntsBusinessCheckService.checkStatus(businessNumber);
        switch (checkResult) {
            case VALID -> { /* 통과 */ }
            case NOT_FOUND -> throw new IllegalArgumentException("국세청에 등록되지 않은 사업자등록번호입니다.");
            case CLOSED -> throw new IllegalArgumentException("폐업 처리된 사업자등록번호입니다.");
            // 아래 둘은 "번호가 틀렸다"가 아니라 "우리가 확인하지 못했다"는 뜻이다.
            // 사용자 잘못이 아니므로 문구를 구분해서, 다시 시도하면 된다는 것을 알린다.
            case SKIPPED_NO_KEY, ERROR -> throw new IllegalStateException(
                    "지금은 국세청 사업자등록 상태조회를 이용할 수 없어 가입을 진행할 수 없습니다. "
                            + "잠시 후 다시 시도해 주세요.");
        }
    }

    // 회원가입 2단계 미리보기용 - 예외를 던지지 않고 결과를 그대로 반환 (프론트가 다음 단계 진행 여부를 결정)
    // valid=false면 프론트가 「다음」을 막는다. 위 signup 검증과 **같은 기준**이어야 한다 —
    // 여기서 통과시키고 최종 가입에서 막으면 3단계를 다 채운 뒤에야 반려된다.
    public java.util.Map<String, Object> checkBusinessNumber(String businessNumber) {
        var checkResult = ntsBusinessCheckService.checkStatus(businessNumber);

        // 7/31 — VALID만 통과. 조회 실패(SKIPPED_NO_KEY·ERROR)도 false다.
        boolean valid = checkResult == popupteam.popupbackend.common.nts.NtsBusinessCheckService.CheckResult.VALID;

        String message = switch (checkResult) {
            case NOT_FOUND -> "국세청에 등록되지 않은 사업자등록번호입니다.";
            case CLOSED -> "폐업 처리된 사업자등록번호입니다.";
            case VALID -> "정상적으로 확인된 사업자등록번호입니다.";
            case SKIPPED_NO_KEY, ERROR ->
                    "지금은 국세청 사업자등록 상태조회를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        };

        // 조회 자체가 안 된 경우와 번호가 잘못된 경우는 사용자에게 다르게 안내해야 한다.
        // 프론트가 문구를 다시 쓰지 않고 이 값으로 톤을 고르도록 플래그를 함께 준다.
        boolean unavailable =
                checkResult == popupteam.popupbackend.common.nts.NtsBusinessCheckService.CheckResult.SKIPPED_NO_KEY
                        || checkResult == popupteam.popupbackend.common.nts.NtsBusinessCheckService.CheckResult.ERROR;

        return java.util.Map.of("valid", valid, "message", message, "unavailable", unavailable);
    }

    // 소비자가 팝업 상세페이지에서 "브랜드명" 클릭 시 조회하는 공개용 정보 (로그인 불필요)
    public popupteam.popupbackend.domain.business.dto.BusinessBrandResponse getBrandInfo(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다."));
        return popupteam.popupbackend.domain.business.dto.BusinessBrandResponse.from(business);
    }
}