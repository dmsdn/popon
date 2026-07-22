# 팝업온 통합 백엔드 (popupon-backend)

기존 `popupbackend`(8080, 주최자·관리자)와 `customerbackend`(8081, 소비자)를 **하나의 Spring Boot 앱**으로 통합한 백엔드.
2026-07-22 팀 결정으로 도메인 패키지 통합안(구 unified-option2)을 채택했다. 통합 배경·대안 비교는 [UNIFICATION-README.md](UNIFICATION-README.md) 참고.

## 실행

```
JAVA_HOME="C:\Users\dlwjd\.jdks\openjdk-26.0.1" ./gradlew bootRun
```

- 포트: **8080 단일** (8081은 더 이상 없음)
- DB: MySQL `popupdb` (application.yml — 로컬 설정은 application-example.yml 참고)
- 카카오 로그인: 개발자 콘솔 Redirect URI가 `http://localhost:8080/login/oauth2/code/kakao`로 등록되어 있어야 함

## 패키지 구조 (도메인 기준)

```
popupteam.popupbackend
├── domain/
│   ├── popup, reservation, waiting, venue, contract, business, admin,
│   │   eventlog, report, cs, terms ...          ← 기존 popupbackend 그대로
│   ├── consumer        ← 소비자 계정·관심 키워드 (구 customerbackend)
│   │   └── auth        ← 카카오 OAuth·소비자 JWT·소비자 보안체인
│   ├── review          ← 리뷰·리뷰 이미지·공감 (구 customerbackend)
│   └── wishlist        ← 찜 (구 customerbackend)
├── common/ (geocoding, exception, upload)
├── config/ (SecurityConfig, WebConfig, FqnBeanNameGenerator)
├── security/ (JwtUtil, JwtAuthenticationFilter — 주최자·관리자용)
└── UnifiedApplication
```

## 인증 체계 (역할 = 토큰 형식)

| 역할 | 토큰 | 처리 체인 |
|---|---|---|
| 주최자 | subject = 사업자 이메일 | `config/SecurityConfig` (any-request 체인) |
| 관리자 | subject = `admin:이메일` | 〃 (컨트롤러가 startsWith 검사) |
| 소비자 | subject 없음, claim `id`(customerId) | `domain/consumer/auth/SecurityConfig` — `/oauth2/**`,`/login/**`,`/api/customer/**` 한정, 컨트롤러가 헤더 직접 파싱 |

JWT 시크릿은 하나이며 통합 전 발급 토큰도 그대로 유효하다.

## 담당(코드 오너십) — 포트가 아니라 패키지 기준

- jsw: `domain/popup·reservation·waiting·venue·contract·admin·eventlog ...` (기존 담당 그대로)
- jmy: `domain/consumer·review·wishlist` (구 customerbackend 코드 — 위치만 이동, 내용 동일)

## 통합으로 달라진 규칙

- **예약은 `domain/reservation` 단일 소유** — 구 customerbackend의 예약 CRUD는 삭제됨. 소비자 예약도 `/api/reservations` 사용.
- 테이블당 엔티티 하나 원칙. 예외 2개(과도기): `domain/customer/Customer`(참조용)와 `domain/consumer/Customer`(@Entity명 `CustomerAccount`)가 같은 `customer` 테이블을 매핑 — 추후 단일화 예정.
- 프론트: popupfrontend(5174)는 Vite proxy, customerfrontend(5173)는 Next rewrites — 둘 다 `/api` → 8080.
- 업로드 파일: 리포 루트 `uploads/` (서버 실행 위치 기준 상대경로 — IntelliJ에서 실행 시 Working directory를 리포 루트가 아닌 `Backend`로 두면 `Backend/uploads`에 생성되니 주의)
