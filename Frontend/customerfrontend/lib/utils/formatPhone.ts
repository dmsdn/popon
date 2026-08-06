// lib/utils/formatPhone.ts
// 전화번호 형식 고정

export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  return /^01[0-9]-\d{3,4}-\d{4}$/.test(value);
}
