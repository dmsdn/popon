# 백엔드 통합안 2종 — 팀 논의 자료 (7/22)

`popupbackend`(8080)와 `customerbackend`(8081)를 하나의 앱으로 합친 두 가지 안.
**둘 다 컴파일·부팅·핵심 엔드포인트 검증 완료** (팝업 조회 200, 무토큰 보호 403, 카카오 리다이렉트 302, 소비자 API 매핑 정상).
원본 두 디렉토리는 그대로 두었고, 논의에서 한 안이 채택되면 그것이 새 메인 브랜치의 `Backend/`가 된다.

| | `unified-option1` (구조 보존 동거) | `unified-option2` (도메인 패키지 통합) |
|---|---|---|
| 패키지 | 두 트리 원형 유지 (`popupteam.popupbackend` + `com.popupplatform.backend`) | 전부 `popupteam.popupbackend` 하위로 편입 (`domain/consumer`·`review`·`wishlist` 신설) |
| 팀 학습 비용 | 없음 — 내 코드 위치 그대로 | 소비자 코드 위치가 바뀜 (아래 이동표 참고) |
| 구조 정합성 | 낮음 (동거) — JwtUtil·SecurityConfig 2벌 공존 | 높음 — 단일 루트, 도메인 기준 배치 |
| 이후 리팩터링 | 별도 이사 작업 필요 | 이미 목적지 |

## 두 안이 공유하는 공통 수정 (코드 최소 수정 원칙)

1. **예약 도메인 단일화(팀 결정 반영)**: 구 customerbackend의 `Reservation`/`ReservationController`/`ReservationRepository`+DTO 2종 **삭제**. 예약은 popupbackend `ReservationService`가 전담.
2. **jjwt 0.11.5 통일**: 소비자 `JwtUtil`만 0.11 API로 이식 (발급 토큰·클레임 동일 — 기존 로그인 세션 전부 유효).
3. **소비자 보안 체인 스코프 한정**: 소비자 `SecurityConfig`에 `securityMatcher("/oauth2/**","/login/**","/api/customer/**")` + `@Order(1)`. 나머지 경로는 기존 popupbackend 체인이 그대로 처리.
4. **JPA 엔티티명 충돌 해소**: 소비자 `Customer`에 `@Entity(name = "CustomerAccount")` (테이블은 그대로 `customer`).
5. **빈 이름 충돌 해소**: `CustomerRepository`(소비자측) → `CustomerAccountRepository` 개명 + 동명 클래스 대비 FQN 빈네임 생성기(`FqnBeanNameGenerator`).
6. **통합 셸**: `UnifiedApplication`(+@EnableScheduling 승계). 기존 메인 클래스 2개 삭제.
7. **설정 병합**: `application.yml` = 기존 8080 설정 + 카카오 OAuth 섹션. `build.gradle` += `spring-boot-starter-security-oauth2-client`.
8. 소비자 `WebConfig` 삭제 (8080 것과 한 줄까지 동일한 중복이었음).

## option2 소비자 코드 이동표

| 구 위치 (com.popupplatform.backend) | 신 위치 (popupteam.popupbackend) |
|---|---|
| entity/Customer·CustomerKeyword·Keyword, repository/{CustomerAccount,CustomerKeyword,Keyword}Repository, controller/{Customer,Interest}Controller, dto/Customer* | `domain/consumer` (+`/dto`) |
| util/JwtUtil, service/CustomOAuth2UserService, handler/OAuth2SuccessHandler, config/SecurityConfig | `domain/consumer/auth` |
| entity/Review·ReviewImage·ReviewLike, repository/Review*, controller/ReviewController, dto/Review* | `domain/review` (+`/dto`) |
| entity/PopupWishlist, repository/PopupWishlistRepository, controller/WishlistController | `domain/wishlist` |
| controller/FileUploadController | `common/upload` |

## 전환(cutover) 시 필요한 후속 작업 — 어느 안이든 동일

- **카카오 개발자 콘솔**: Redirect URI를 `http://localhost:8080/login/oauth2/code/kakao`로 재등록 (기존 8081 등록 대체).
- **소비자 프론트(customerfrontend)**: `NEXT_PUBLIC_API_BASE_URL`/API_BASE를 8080으로, auth.ts의 OAuth 리다이렉트 주소도 8080으로.
- DB: 데이터 이관 없음(이미 popupdb 공유). 구 `reservation` 테이블만 수동 DROP.
- IntelliJ 실행 구성을 새로 만들 것 (기존 실행 구성의 JWT 시크릿 오버라이드 의심 이슈도 이때 함께 해소).
- 문서(WBS·요구사항정의서)의 8080/8081 표기 정리 — 담당 구분은 이제 포트가 아니라 패키지 기준.

## 실행 방법 (검증용)

```
cd Backend/unified-option1   # 또는 unified-option2
JAVA_HOME="C:\Users\dlwjd\.jdks\openjdk-26.0.1" ./gradlew bootRun
```
기본 8080. 기존 백엔드가 떠 있으면 `--args='--server.port=8090'`으로 병행 확인 가능.
