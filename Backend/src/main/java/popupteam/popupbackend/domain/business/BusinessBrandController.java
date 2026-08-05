package popupteam.popupbackend.domain.business;

import popupteam.popupbackend.domain.business.dto.BusinessBrandResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

// 소비자가 팝업 상세페이지에서 브랜드명을 클릭했을 때 쓰는 공개 조회 API.
// 회원가입/로그인/정보수정을 다루는 BusinessController(/api/business/auth/**)와는
// 목적이 달라서 별도 컨트롤러로 분리 - 이 경로는 인증 없이 누구나 호출 가능해야 함.
@RestController
@RequiredArgsConstructor
public class BusinessBrandController {

    private final BusinessService businessService;

    @GetMapping("/api/business/{id}")
    public ResponseEntity<BusinessBrandResponse> getBrand(@PathVariable Long id) {
        return ResponseEntity.ok(businessService.getBrandInfo(id));
    }
}