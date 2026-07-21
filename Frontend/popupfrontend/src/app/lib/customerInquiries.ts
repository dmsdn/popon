// 소비자 → 주최자 문의 저장 모듈.
// ⚠ 백엔드에 소비자→주최자 문의 API가 아직 없어 localStorage 기반(같은 브라우저 데모 한정).
//    백엔드 구현 시 함수 내부만 API 호출로 교체하면 화면 코드는 그대로 동작한다.
//    - 소비자 접수:  POST /api/popups/{popupId}/questions   (소비자 앱 상세페이지에 문의 버튼 필요 — pew)
//    - 주최자 조회:  GET  /api/business/questions            (내 팝업 전체, 팝업명 포함)
//    - 주최자 답변:  PATCH /api/questions/{id}/answer
import { localNowIso } from "./walkinQueue";

export type CustomerInquiry = {
  id: string;
  popupId: number;
  popupTitle: string;
  customerName: string;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  answerContent?: string;
  answeredAt?: string;
  createdAt: string;
};

const KEY = "sellerCustomerInquiries";

export function loadCustomerInquiries(): CustomerInquiry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(list: CustomerInquiry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function answerCustomerInquiry(id: string, answerContent: string): CustomerInquiry[] {
  const next = loadCustomerInquiries().map((q) =>
    q.id === id ? { ...q, status: "ANSWERED" as const, answerContent, answeredAt: localNowIso() } : q,
  );
  save(next);
  return next;
}

// 데모 시드 — 내 팝업 제목 기준으로 최초 1회만 생성 (백엔드 연동 시 제거)
export function seedIfEmpty(popups: { id: number; title: string }[]): CustomerInquiry[] {
  const cur = loadCustomerInquiries();
  if (cur.length > 0 || popups.length === 0) return cur;
  const p0 = popups[0];
  const p1 = popups[1] ?? popups[0];
  const seeded: CustomerInquiry[] = [
    {
      id: crypto.randomUUID(),
      popupId: p0.id,
      popupTitle: p0.title,
      customerName: "김소비",
      title: "주차 가능한가요?",
      content: "방문 예정인데 근처에 주차장이 있는지, 있다면 할인권을 주시는지 궁금합니다.",
      status: "PENDING",
      createdAt: localNowIso(),
    },
    {
      id: crypto.randomUUID(),
      popupId: p1.id,
      popupTitle: p1.title,
      customerName: "이관심",
      title: "굿즈 재입고 일정 문의",
      content: "한정판 키링이 품절이던데 재입고 계획이 있을까요?",
      status: "PENDING",
      createdAt: localNowIso(),
    },
  ];
  save(seeded);
  return seeded;
}
