# 팝업온 통합 백엔드 (popupon-backend)

기존 `popupbackend`(8080, 주최자·관리자)와 `customerbackend`(8081, 소비자)를 **하나의 Spring Boot 앱**으로 통합한 백엔드.
2026-07-22 팀 결정으로 도메인 패키지 통합안(구 unified-option2)을 채택. 통합 배경·대안 비교는 [UNIFICATION-README.md](UNIFICATION-README.md) 참고.

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

## 팀원 Pull 후 체크리스트 (unified 브랜치 최초 전환 시)

**0. 전환 전** — 작업 중인 변경이 있으면 반드시 커밋(또는 stash)부터. 구 `Backend/popupbackend`·`customerbackend` 안에 커밋 안 한 수정이 있으면 checkout이 거부되거나 날아갈 수 있음.

**1. IntelliJ 재연결** — `Could not set process working directory ... popupbackend (errno 2)` 오류가 나면:
   1. Gradle 도구창에서 구 `popupbackend`(있다면 `customerbackend`도) 선택 → `-` (Unlink)
   2. `+` → `Backend/build.gradle` 선택 → `popupon-backend`로 연결
   3. Run → Edit Configurations에서 옛 실행 구성 전부 삭제 → `UnifiedApplication` 열어 ▶ 실행하면 새 구성 자동 생성
      (이때 새 구성의 Environment variables 칸이 **비어 있는지** 확인 — 옛 구성에 JWT 시크릿 오버라이드가 숨어 있던 의심 사례 있음)

**2. application.yml 생성 (필수— 이거 없으면 기동 실패)** — application.yml은 비밀번호 포함이라 gitignore 대상(커밋 안 됨), 각자 로컬에 만들어야 함:
   `src/main/resources/application-example.yml` 복사 → 같은 폴더에 `application.yml` → datasource password만 본인 MySQL 비밀번호로 수정.
   (구 popupbackend·customerbackend에서 이미 하던 방식과 동일. 이후 기기별 값 변경은 application.yml을 직접 고치거나, `application-local-example.yml` 복사 → `application-local.yml`로 부분 덮어쓰기 — 둘 다 커밋되지 않음)

**3. DB 시드/정리** — 백엔드 1회 기동(테이블 자동 생성) 후:
   ```
   mysql -u root -p popupdb < db-init.sql
   ```
   관리자 공용 계정(admin@popupon.kr/admin1234)·키워드 8종 삽입 + 구 reservation 테이블 삭제 (여러 번 실행해도 안전)

**4. 프론트 의존성** — 두 프론트 모두 `npm install` (popupfrontend: qrcode.react·jsqr 등 / customerfrontend: pew 신규 의존성)

**5. 포트** — 백엔드는 이제 **8080 하나**. 8081을 띄우는 옛 실행 구성·스크립트는 삭제. 프론트는 기존대로 5174(주최자·관리자)/5173(소비자).

**6. 카카오 로그인 (선택)** — 카카오 개발자 콘솔 Redirect URI가 `http://localhost:8080/login/oauth2/code/kakao`로 재등록된 뒤부터 동작. 콘솔 권한자 1명이 처리하면 전원 적용.

**7. 옛 브랜치** — jsw/restart·jmy 등 기존 브랜치의 이후 커밋은 구 경로 기준이라 unified에 자동 병합 불가. 전환 후 새 작업은 unified에서 분기할 것. 소비자 코드 새 위치는 위 "패키지 구조" 참고.
