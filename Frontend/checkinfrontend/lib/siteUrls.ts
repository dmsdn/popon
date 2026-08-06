// lib/siteUrls.ts
// 이 앱(현장 체크인용 태블릿 화면)에서 소비자 앱(customerfrontend)으로 나가는 주소 관리
//
// ─────────────────────────────────────────────────────────────────────────────
// [수정] 배포된 QR이 http://localhost:3000 을 가리키고 있었어요.
//
// NEXT_PUBLIC_CONSUMER_URL이 설정되어 있으면 해당 값을 우선 사용하고
// 환경변수가 없을 경우 현재 접속 주소를 기준으로 소비자 앱 주소를 자동 생성하도록 변경
//
// 배포 환경에서는 checkin.<도메인>에서 서브도메인을 제거해 <도메인>으로 연결
// 로컬에서는 localhost:5176에서 소비자 앱 포트인 localhost:5173으로 연결되도록 처리
//
// **환경변수를 잊어도 맞는 주소가 나오도록** 현재 접속 주소에서 유도
//   배포:  checkin.<도메인>  →  <도메인>        (서브도메인 한 겹만 벗김)
//   로컬:  localhost:5176    →  localhost:5173  (소비자 앱 포트)
// ─────────────────────────────────────────────────────────────────────────────

/** 이 앱이 서비스되는 서브도메인 라벨. 배포에서 checkin.<도메인> 으로 붙어 있음 */
const SUBDOMAIN = "checkin.";

/** 소비자 앱의 로컬 개발 포트 (customerfrontend는 5173, 이 앱은 5176) */
const LOCAL_CONSUMER_PORT = 5173;

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * 소비자 앱의 오리진 구하기
 *
 * 소비자 앱의 실제 접속 주소(Origin)를 브라우저에서 동적으로 확인하고, 
 * 초기 렌더링 시 잘못된 QR이 표시되지 않도록 클라이언트에서 계산하도록 수정
 */
export function getConsumerUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CONSUMER_URL;
  if (fromEnv) return trimSlash(fromEnv);

  if (typeof window === "undefined") {
    return `http://localhost:${LOCAL_CONSUMER_PORT}`;
  }

  const { protocol, hostname, port } = window.location;

  // 배포 - checkin.3.35.16.87.nip.io → 3.35.16.87.nip.io
  if (hostname.startsWith(SUBDOMAIN)) {
    return `${protocol}//${hostname.slice(SUBDOMAIN.length)}`;
  }

  // 로컬 - 이 앱은 5176, 소비자 앱은 5173
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:${LOCAL_CONSUMER_PORT}`;
  }

  // 그 밖(같은 호스트에 경로로 얹은 구성 등)은 같은 오리진으로
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

// 팝업 상세페이지의 "사전 예약" 화면으로 바로 연결되는 주소
//  > 소비자 앱(app/popup/[id]/page.tsx)이 ?action=reservation 쿼리를 보면 예약 모달을 자동으로 열어줌
export const consumerReservationUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}?action=reservation`;

// [신규] 웨이팅 전용 팝업의 QR 주소를 ?action=waiting으로 연결해 앱에서 바로 웨이팅 등록을 유도하도록 수정
export const consumerWaitingUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}?action=waiting`;

// [신규] 예약과 웨이팅이 모두 가능한 팝업은 특정 모달을 바로 열지 않고 상세페이지로 이동해 사용자가 원하는 이용 방식을 직접 선택하도록 개선
export const consumerPopupUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}`;
