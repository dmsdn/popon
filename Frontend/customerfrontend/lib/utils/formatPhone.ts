// lib/utils/formatPhone.ts
//
// 전화번호 입력칸마다 사람이 010-1234-5678, 01012345678, 010 1234 5678 등
// 제각각으로 입력하던 걸 하나의 형식으로 고정해요 (회원가입/내정보수정 공통 사용).

export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  return /^01[0-9]-\d{3,4}-\d{4}$/.test(value);
}
