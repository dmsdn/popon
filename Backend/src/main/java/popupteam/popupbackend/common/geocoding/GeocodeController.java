package popupteam.popupbackend.common.geocoding;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class GeocodeController {

    private final GeocodingService geocodingService;

    // 팝업 등록/수정 폼에서 저장 전 지도 미리보기용 - 주소 -> 좌표 변환 (인증 불필요, secret key는 서버 안에만 있음)
    @GetMapping("/api/geocode")
    public ResponseEntity<?> geocode(@RequestParam String address) {
        return geocodingService.geocode(address)
                .map(coord -> ResponseEntity.ok(java.util.Map.of(
                        "latitude", coord.latitude(),
                        "longitude", coord.longitude()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}