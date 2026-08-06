

export const SELLER_URL =
  import.meta.env.VITE_SELLER_URL || "http://localhost:5174";

/** 주최자 정보사이트 홈 (상단바 「서비스 홈」) */
export const SELLER_HOME_URL = `${SELLER_URL}/`;

// 소비자 앱 (8/4). 팝업 연동 배너의 링크를 관리자 화면에서 **미리 보여주기** 위한 값이다.
// ⚠ 실제로 저장되는 링크는 서버가 app.customer-base-url로 만든다 — 여기 값은 표시용일 뿐이라
//    둘이 어긋나도 배너는 정상 동작한다(화면 안내만 달라진다).
export const CONSUMER_URL =
  import.meta.env.VITE_CONSUMER_URL || "http://localhost:5173";

/** 소비자 팝업 상세페이지 주소 (배너 링크 미리보기) */
export const consumerPopupUrl = (popupId: number) => `${CONSUMER_URL}/popup/${popupId}`;
