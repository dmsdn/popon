// lib/postLoginRedirect.ts
//
// [신규] 로그인이 필요한 액션(예약하기/웨이팅하기 등)을 비로그인 상태에서 누르면
// router.push("/login")으로 보내는데, 로그인 완료 후엔 항상 홈으로만 갔어요.
// 예를 들어 특정 팝업 상세페이지에서 "웨이팅하기"를 눌렀다가 로그인하고 오면,
// 다시 그 팝업으로 안 돌아가고 홈에 떨어지는 문제가 있었어요.
// sessionStorage에 "로그인 끝나면 돌아갈 경로"를 잠깐 저장해뒀다가, 로그인/가입
// 완료 시점에 꺼내서 써요 (탭을 닫으면 사라지는 게 자연스러워서 localStorage 대신
// sessionStorage를 씁니다).

const KEY = "post_login_redirect";

export function saveRedirectTarget(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    // 저장 실패해도 로그인 자체는 진행돼야 해서 조용히 무시
  }
}

export function consumeRedirectTarget(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    if (value) window.sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
