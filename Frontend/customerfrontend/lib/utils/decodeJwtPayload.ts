// lib/utils/decodeJwtPayload.ts
//
// [신규] 가입대기 토큰(pendingToken) 안에는 카카오/구글에서 받아온 닉네임/프로필
// 이미지가 이미 들어있어요. 이 값을 화면에 미리 채워 보여주려고, JWT의 payload
// 부분만 가볍게 디코딩해요. 서명 검증은 하지 않아요(백엔드가 어차피 제출 시점에
// 다시 검증하니, 여긴 그냥 "미리 보여주기 좋으라고" 읽는 용도예요).

export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
