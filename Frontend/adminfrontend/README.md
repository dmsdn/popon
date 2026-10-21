# 팝온 관리자 콘솔 (adminfrontend)

플랫폼 운영팀이 **팝업 심사, 회원 · 콘텐츠 관리, CS 처리, 플랫폼 통계**를 다루는 관리자 전용 웹.

> 담당: 팀원 (주최자 · 관리자 프론트엔드)

<br>

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 빌드 | Vite 6 |
| 프레임워크 | React 18, React Router 7 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4, Radix UI 기반 컴포넌트 (shadcn/ui 구성) |
| 차트 | Recharts |

처음에는 주최자 앱(popupfrontend) 안의 `/admin` 경로였는데, 같은 origin에서 **관리자 토큰과 주최자 토큰이 localStorage에서 충돌**하는 문제가 있어 별도 앱으로 분리했습니다.

<br>

## 주요 기능

| 메뉴 | 경로 | 기능 |
|---|---|---|
| 대시보드 | `/admin` | 방문자 추이, 심사 대기 · CS · 회원 집계, 오늘 체크인 수, 신고 처리 현황, 지역별 팝업 분포 |
| 팝업 관리 | `/admin/popups` | 전체 팝업 목록, 상세에서 **심사(승인 / 반려) · 게시중지** |
| 계약 관리 | `/admin/contracts` | 승인된 팝업의 공간 대관 계약금 등록, 계약체결 → 제작·시공 → 운영 중 → 철거·정산 4단계 전환 |
| 주최자 회원 | `/admin/businesses` | 사업자 계정 목록 + 팝업 등록 현황, 검색 · 정렬 |
| 소비자 회원 | `/admin/members` | 회원 목록, 이용 정지 · 해제 |
| 관리자 계정 | `/admin/accounts` | 관리자 계정 조회 (계정은 가입 없이 DB에서 발급) |
| 카테고리 · 지역 | `/admin/masters` | 서비스 전반에서 쓰는 카테고리 · 지역 마스터 관리. 삭제 시 해당 항목을 관심으로 고른 회원 수를 함께 안내 |
| 배너 · 공지 | `/admin/content` | 소비자 홈 메인 배너(이미지 업로드) · 공지 배너 관리 |
| 문의 · 신고 | `/admin/cs` | 소비자 문의, 주최자 문의, 후기 신고 3탭. 신고는 **반려(후기 유지) / 후기 가리기** 중 선택 |
| 주최자 공지 | `/admin/notices` | 특정 주최자에게 공지 발송 (주최자 센터 알림함으로 전달) |
| 플랫폼 통계 | `/admin/stats` | 팝업별 방문자 랭킹, 별점 랭킹, 브랜드 재입점률 |

<br>

## 폴더 구조

```
adminfrontend/src/app/
├── routes.tsx              # 라우트 정의 (/ → /admin 리다이렉트)
├── admin/
│   ├── AdminRoot.tsx       # 사이드바 · 상단바 레이아웃, 세션 표시
│   ├── components/         # 로그인 게이트
│   └── pages/              # 메뉴별 화면
├── lib/                    # API 래퍼 (popupfrontend와 동일 구조)
├── context/                # AuthContext
└── components/ui/          # Radix 기반 공용 컴포넌트
```

<br>

## 실행 방법

```powershell
npm install
npm run dev
```

`http://localhost:5175`에서 열립니다. `/api`, `/uploads` 요청은 Vite 프록시가 통합 백엔드(`localhost:8080`)로 전달합니다.

관리자 계정은 회원가입 기능이 없어서, 백엔드의 `db-init.sql`로 생성한 계정으로 로그인합니다.

| 환경변수 | 필수 | 설명 |
|---|---|---|
| `VITE_API_TARGET` | | 프록시할 백엔드 주소 (기본 `http://localhost:8080`) |
| `VITE_SELLER_URL` | | 배포 빌드 시 상단바 「서비스 홈」 링크 주소 |
