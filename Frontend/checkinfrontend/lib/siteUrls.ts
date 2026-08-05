// lib/siteUrls.ts
// 이 앱(현장 체크인용 태블릿 화면)에서 소비자 앱(customerfrontend)으로 나가는
// 주소를 한 곳에 모아둬요 - 예를 들어 "사전 예약 QR"이 가리키는 주소가 여기저기
// 흩어져 있으면, 배포 주소가 바뀔 때 한 군데만 고치고 나머지가 옛날 주소로
// 남는 실수가 생기기 쉬워요.
//
// ─────────────────────────────────────────────────────────────────────────────
// [수정 8/5] 배포된 QR이 http://localhost:3000 을 가리키고 있었어요.
//
// 원래는 NEXT_PUBLIC_CONSUMER_URL 을 빌드 때 넘기는 방식이었는데, 배포 문서에
// 「환경변수 없음」이라고 적혀 있어서 아무도 안 넘겼고 기본값이 그대로 번들에
// 굳었어요. 빌드는 성공하고 경고도 안 떠서 배포 전엔 알 수 없어요.
// (관리자 앱도 8/3에 똑같은 이유로 「서비스 홈」이 localhost로 갔었어요.)
//
// 이 QR은 특히 나빠요 - **손님 휴대폰이 스캔하는 주소**라서 localhost면 그 폰의
// localhost를 찾아가 아무것도 안 열려요. 게다가 기본값이 3000번이었는데 소비자 앱은
// 5173이라, 로컬에서도 맞은 적이 없어요.
//
// 그래서 **환경변수를 잊어도 맞는 주소가 나오도록** 현재 접속 주소에서 유도해요.
//   배포:  checkin.<도메인>  →  <도메인>        (서브도메인 한 겹만 벗김)
//   로컬:  localhost:5176    →  localhost:5173  (소비자 앱 포트)
// 환경변수를 넘기면 그 값이 항상 우선이에요 - 주소 규칙이 다른 배포에 대비.
// ─────────────────────────────────────────────────────────────────────────────

/** 이 앱이 서비스되는 서브도메인 라벨. 배포에서 checkin.<도메인> 으로 붙어 있어요. */
const SUBDOMAIN = "checkin.";

/** 소비자 앱의 로컬 개발 포트 (customerfrontend는 5173, 이 앱은 5176이에요) */
const LOCAL_CONSUMER_PORT = 5173;

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * 소비자 앱의 오리진을 구해요.
 *
 * 브라우저에서만 정확한 값이 나와요. 이 앱은 output:"export" 라 빌드 시점에 HTML이
 * 한 번 만들어지는데 그때는 window가 없어 로컬 기본값이 들어가요. 화면에 붙는
 * 순간(하이드레이션) 다시 계산되니 실제로 보이는 값은 맞아요. 그래도 첫 렌더에
 * 틀린 QR이 잠깐 보이지 않도록, 호출하는 쪽에서 useEffect로 계산해요.
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

  // 그 밖(같은 호스트에 경로로 얹은 구성 등)은 같은 오리진으로 둬요.
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

// 팝업 상세페이지의 "사전 예약" 화면으로 바로 연결되는 주소.
// 소비자 앱(app/popup/[id]/page.tsx)이 ?action=reservation 쿼리를 보면
// 예약 모달을 자동으로 열어줘요.
export const consumerReservationUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}?action=reservation`;

// [신규 8/5] 웨이팅만 받는 팝업(queueMode === "ONSITE_WAITING_ONLY")용 주소 -
// 사전예약 자체가 없는 팝업이라 위 주소(?action=reservation)로 보내면 안 열리는
// 기능을 안내하는 셈이 돼요. 대신 ?action=waiting으로 보내서, 앱에서도 똑같이
// 웨이팅을 등록할 수 있다는 걸 QR로 홍보해요(앱 사용 유도).
export const consumerWaitingUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}?action=waiting`;

// [신규 8/5] 예약/웨이팅 둘 다 가능한 팝업(queueMode === "BOTH")용 주소 - 어느
// 한쪽 모달을 강제로 열지 않고 팝업 상세페이지로만 보내서, 앱에서 손님이
// 예약/웨이팅 중 원하는 쪽을 직접 고르게 해요.
export const consumerPopupUrl = (popupId: number | string) =>
  `${getConsumerUrl()}/popup/${popupId}`;
