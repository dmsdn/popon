// lib/siteUrls.ts
// 이 앱(현장 체크인용 태블릿 화면)에서 소비자 앱(customerfrontend)으로 나가는
// 주소를 한 곳에 모아둬요 - 예를 들어 "사전 예약 QR"이 가리키는 주소가 여기저기
// 흩어져 있으면, 배포 주소가 바뀔 때 한 군데만 고치고 나머지가 옛날 주소로
// 남는 실수가 생기기 쉬워요.
//
// ⚠ Next.js에서 NEXT_PUBLIC_* 환경변수는 빌드 시점에 번들에 박혀요. 배포용
//   빌드에서는 반드시 실제 소비자 앱 주소를 넘겨주세요.
//     NEXT_PUBLIC_CONSUMER_URL=https://popon.example.com
//   안 넘기면 로컬 개발 기본값(고객 앱 기본 포트)으로 동작해요.

export const CONSUMER_URL = process.env.NEXT_PUBLIC_CONSUMER_URL || "http://localhost:3000";

// 팝업 상세페이지의 "사전 예약" 화면으로 바로 연결되는 주소.
// 소비자 앱(app/popup/[id]/page.tsx)이 ?action=reservation 쿼리를 보면
// 예약 모달을 자동으로 열어줘요.
export const consumerReservationUrl = (popupId: number | string) =>
  `${CONSUMER_URL}/popup/${popupId}?action=reservation`;
