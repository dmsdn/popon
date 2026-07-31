// 다른 앱으로 나가는 주소 (7/31 환경변수화).
//
// 이 앱(주최자·5174)은 소비자 앱과 관리자 앱으로 나가는 링크를 여럿 갖고 있다.
// 랜딩의 팝업 카드, 상단바 「서비스페이지」, 푸터, 웨이팅 관제의 QR 안내 등이 그것이다.
// 그동안 세 파일에 http://localhost:5173 이 각각 박혀 있어서,
// **배포하면 사용자가 자기 PC로 가는 링크**가 됐다. 어제 소비자 앱의 OAUTH_BASE에서 겪은 것과
// 완전히 같은 문제이고(부록 30번), 이번에는 랜딩의 「지금 바로 확인하기」와 모든 팝업 카드가 그랬다.
//
// 값이 세 파일에 흩어져 있던 것도 문제였다 — 한 곳만 고치면 나머지가 조용히 옛 주소로 남는다.
// 여기 한 곳에 모으고 환경변수로 뺀다.
//
// ⚠ Vite 환경변수는 **빌드 시점에 번들로 박힌다.** 런타임에 못 바꾸므로
//    배포용 빌드에서는 반드시 아래 값을 넘겨야 한다.
//      $env:VITE_CONSUMER_URL="https://3.35.16.87.nip.io"
//      $env:VITE_ADMIN_URL="https://admin.3.35.16.87.nip.io"
//    기본값은 로컬 개발 포트라, 안 넘기면 지금까지와 똑같이 동작한다.

export const CONSUMER_URL =
  import.meta.env.VITE_CONSUMER_URL || "http://localhost:5173";

export const ADMIN_URL =
  import.meta.env.VITE_ADMIN_URL || "http://localhost:5175";

/** 소비자 앱의 팝업 상세 — 랜딩 카드·배너가 새 탭으로 연다 */
export const consumerPopupUrl = (id: number | string) => `${CONSUMER_URL}/popup/${id}`;

/** 소비자 앱 회원가입 — 현장 웨이팅 안내에서 쓴다 */
export const CONSUMER_SIGNUP_URL = `${CONSUMER_URL}/signup`;

/** 관리자 콘솔 진입점 */
export const ADMIN_CONSOLE_URL = `${ADMIN_URL}/admin`;
