package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * region 테이블이 비어있을 때만 기본 시/도 목록을 채워 넣는다.
 * (KeywordDataInitializer와 동일 패턴) 이미 데이터가 있으면 아무것도 안 함.
 * 구/단위로 더 세분화하고 싶으면 DEFAULT_REGIONS만 바꾸면 됨.
 */
@Component
@RequiredArgsConstructor
public class RegionDataInitializer implements CommandLineRunner {

    private final RegionRepository regionRepository;

    private static final List<String> DEFAULT_REGIONS = List.of(
            "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
            "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    );

    @Override
    public void run(String... args) {
        if (regionRepository.count() > 0) {
            return;
        }
        for (String name : DEFAULT_REGIONS) {
            regionRepository.save(new Region(name));
        }
        System.out.println("region 테이블 초기 데이터 " + DEFAULT_REGIONS.size() + "건 삽입 완료");
    }
}