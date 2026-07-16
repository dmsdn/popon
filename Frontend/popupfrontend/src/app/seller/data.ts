// 주최자센터 공통 목업 데이터 (백엔드 연동 전 시뮬레이션용)

export type PopupStatus = "심사중" | "게시중" | "반려" | "임시저장" | "종료";

export const MY_POPUPS: {
  id: string; name: string; brand: string; period: string; venue: string;
  status: PopupStatus; visitors: number; note?: string;
}[] = [
  { id: "PU-2407-001", name: "무너의 여름방학 팝업", brand: "무너프렌즈", period: "2026-07-10 ~ 07-27", venue: "성수 언더스탠드에비뉴 A동", status: "게시중", visitors: 12480 },
  { id: "PU-2407-014", name: "글로우랩 선케어 스튜디오", brand: "글로우랩", period: "2026-07-20 ~ 08-03", venue: "더현대 서울 B1 팝업존", status: "심사중", visitors: 0 },
  { id: "PU-2406-031", name: "레트로 게임 아케이드전", brand: "픽셀컴퍼니", period: "2026-08-01 ~ 08-15", venue: "홍대 AK& 5F", status: "반려", visitors: 0, note: "대표 이미지 화질 기준 미달 · 상세설명 내 외부 링크 삭제 필요" },
  { id: "PU-2407-022", name: "제주 감귤위크", brand: "제주스", period: "2026-08-10 ~ 08-24", venue: "잠실 롯데월드몰 1F", status: "임시저장", visitors: 0 },
  { id: "PU-2405-009", name: "빈티지 바이닐 마켓", brand: "레코드랩", period: "2026-05-02 ~ 05-18", venue: "성수 언더스탠드에비뉴 B동", status: "종료", visitors: 8930 },
];

export const RESERVATION_SLOTS = [
  { time: "10:00", capacity: 40, booked: 40 },
  { time: "11:00", capacity: 40, booked: 38 },
  { time: "12:00", capacity: 40, booked: 40 },
  { time: "13:00", capacity: 40, booked: 33 },
  { time: "14:00", capacity: 40, booked: 40 },
  { time: "15:00", capacity: 40, booked: 29 },
  { time: "16:00", capacity: 40, booked: 21 },
  { time: "17:00", capacity: 40, booked: 12 },
  { time: "18:00", capacity: 30, booked: 6 },
];

export type CheckinStatus = "예약확정" | "체크인" | "노쇼";
export const RESERVATIONS: { id: string; name: string; phone: string; slot: string; count: number; status: CheckinStatus }[] = [
  { id: "R-90211", name: "김서연", phone: "010-****-1234", slot: "10:00", count: 2, status: "체크인" },
  { id: "R-90212", name: "이준호", phone: "010-****-5678", slot: "10:00", count: 1, status: "체크인" },
  { id: "R-90213", name: "박지민", phone: "010-****-9012", slot: "11:00", count: 3, status: "예약확정" },
  { id: "R-90214", name: "최유나", phone: "010-****-3456", slot: "11:00", count: 2, status: "노쇼" },
  { id: "R-90215", name: "정다은", phone: "010-****-7890", slot: "12:00", count: 4, status: "예약확정" },
  { id: "R-90216", name: "한상우", phone: "010-****-2345", slot: "12:00", count: 1, status: "예약확정" },
  { id: "R-90217", name: "오하늘", phone: "010-****-6789", slot: "13:00", count: 2, status: "예약확정" },
];

export const WAITING_QUEUE = [
  { no: 41, name: "장민서", count: 2, waited: "12분", called: false },
  { no: 42, name: "윤태양", count: 1, waited: "10분", called: false },
  { no: 43, name: "서지우", count: 4, waited: "7분", called: false },
  { no: 44, name: "임소율", count: 2, waited: "4분", called: false },
  { no: 45, name: "강도윤", count: 3, waited: "1분", called: false },
];

export const PRODUCTS = [
  { id: "GD-001", name: "무너 미니 인형 키링", option: "옐로우", price: 15000, stock: 132, safety: 50, sold: 468 },
  { id: "GD-002", name: "무너 미니 인형 키링", option: "핑크", price: 15000, stock: 41, safety: 50, sold: 559 },
  { id: "GD-003", name: "여름방학 스티커팩", option: "단일", price: 6000, stock: 302, safety: 100, sold: 698 },
  { id: "GD-004", name: "빅사이즈 쿠션", option: "단일", price: 39000, stock: 8, safety: 20, sold: 92 },
  { id: "GD-005", name: "한정판 아트 포스터", option: "A2", price: 12000, stock: 0, safety: 30, sold: 300 },
];

export const DAILY_STATS = [
  { date: "07-08", visitors: 620, revenue: 2140, reservations: 180 },
  { date: "07-09", visitors: 748, revenue: 2620, reservations: 204 },
  { date: "07-10", visitors: 1355, revenue: 5010, reservations: 320 },
  { date: "07-11", visitors: 1820, revenue: 6890, reservations: 352 },
  { date: "07-12", visitors: 1954, revenue: 7420, reservations: 360 },
  { date: "07-13", visitors: 1213, revenue: 4160, reservations: 298 },
  { date: "07-14", visitors: 1387, revenue: 4980, reservations: 310 },
];

export const STATUS_BADGE: Record<PopupStatus, string> = {
  게시중: "bg-emerald-50 text-emerald-600 border-emerald-200",
  심사중: "bg-amber-50 text-amber-600 border-amber-200",
  반려: "bg-red-50 text-red-500 border-red-200",
  임시저장: "bg-slate-100 text-slate-500 border-slate-200",
  종료: "bg-slate-100 text-slate-400 border-slate-200",
};
