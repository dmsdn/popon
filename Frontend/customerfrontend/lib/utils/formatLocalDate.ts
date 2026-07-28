// lib/utils/formatLocalDate.ts
//
// [수정] `date.toISOString().slice(0, 10)`을 곳곳에서 썼는데, toISOString()은 UTC로
// 변환해요. 한국(UTC+9)에서 날짜를 자정(00:00 로컬)으로 만든 Date는 UTC로 변환하면
// 전날 15:00이 되어서, slice(0,10)로 뽑은 날짜가 실제 선택한 날짜보다 하루 전으로
// 나오는 버그가 있었어요 (예약 화면에서 고른 날짜와 예약 상세에 뜨는 날짜가 다르게
// 보이던 원인). UTC 변환 없이 로컬 연/월/일 그대로 문자열로 만듭니다.

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
