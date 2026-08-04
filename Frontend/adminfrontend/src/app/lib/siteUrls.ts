// 다른 앱으로 나가는 주소 (8/3 환경변수화).
//
// 이 앱(관리자)에서 밖으로 나가는 링크는 상단바의 「서비스 홈」 하나뿐인데,
// 그 한 줄이 `http://localhost:5174/` 로 박혀 있었다. 배포 서버에서 관리자가 그걸 누르면
// **자기 PC로 간다.** 주최자 앱은 7/31에 같은 문제를 siteUrls.ts로 정리했는데
// (거기는 세 파일에 흩어져 있었다), 관리자 앱은 그 정리에서 빠져 있었다.
//
// ⚠ Vite 환경변수는 **빌드 시점에 번들로 박힌다.** 런타임에 못 바꾸므로
//    배포용 빌드에서는 반드시 값을 넘겨야 한다.
//      $env:VITE_SELLER_URL="https://seller.3.35.16.87.nip.io"
//    안 넘기면 아래 기본값(로컬 개발 포트)으로 조용히 굳는다 — 빌드는 성공하고 경고도 없다.

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
