// data/mockPopups.ts
import { POPUP_STATUS, type PopupStatus } from "@/lib/constants/status";

export type PopupItem = {
  id: string;
  name: string;
  dateRange?: string;
  location?: string;
  badge?: string;
  brandId?: string; // data/mockBrands.ts의 Brand.id와 연결
  status?: PopupStatus; // 백엔드 popup.PopupStatus 값 (PENDING/REJECTED/BEFOR/OPEN/CLOSED)
};

export type ReviewItem = {
  id: string;
  popupName: string;
  nickname: string;
  content: string;
  date: string;
  rating: number;
  photos?: string[]; // 사진 URL 배열 (없으면 사진 없는 후기)
};

export const promoCards = [
  { id: "1", title: "프로모션 카드 1", href: "/popup/1" },
  { id: "2", title: "프로모션 카드", href: "/popup/2" },
  { id: "3", title: "프로모션 카드 3", href: "/popup/3" },
];

export const categories = [
  "성수 뷰티", "용산 애니", "성수 문구", "더현대 굿즈", "홍대 애니", "성수 문구", "더현대 굿즈",
];

export const recentPopups: PopupItem[] = [
  { id: "1", name: "스타벅스 서머" },
  { id: "2", name: "아더에러" },
  { id: "3", name: "탬버린즈", brandId: "tamburins", status: POPUP_STATUS.OPEN },
  { id: "4", name: "무신사 스탠다드", brandId: "musinsa", status: POPUP_STATUS.OPEN },
  { id: "5", name: "산리오 카페", brandId: "sanrio", status: POPUP_STATUS.OPEN },
];

export const popularPopups: PopupItem[] = [
  { id: "1", name: "무신사 스탠다드", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "1", brandId: "musinsa", status: POPUP_STATUS.OPEN },
  { id: "2", name: "산리오 카페", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", badge: "2", brandId: "sanrio", status: POPUP_STATUS.OPEN },
  { id: "3", name: "디올 뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", badge: "3" },
  { id: "4", name: "룰루레몬", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "4" },
];

export const openingSoonPopups: PopupItem[] = [
  { id: "1", name: "포켓몬 스토어", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "D-1", brandId: "pokemon", status: POPUP_STATUS.BEFOR },
  { id: "2", name: "젠틀몬스터", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", badge: "D-1" },
  { id: "3", name: "빈폴 팝업", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", badge: "D-1" },
  { id: "4", name: "나이키 런닝", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "D-1" },
  { id: "5", name: "어글리덕", dateRange: "26.08.07 ~ 26.08.13", location: "용산", badge: "D-1" },
];

export const freePopups: PopupItem[] = [
  { id: "1", name: "하이브 인사이트", dateRange: "26.08.07 ~ 26.08.13", location: "용산" },
  { id: "2", name: "LG 하우스", dateRange: "26.08.07 ~ 26.08.13", location: "여의도" },
  { id: "3", name: "배스킨라빈스 팝업", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
  { id: "4", name: "스타벅스 서머", dateRange: "26.08.07 ~ 26.08.13", location: "홍대" },
  { id: "5", name: "아더에러", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
];

export const reviews: ReviewItem[] = [
  { id: "1", popupName: "산리오 카페", nickname: "말랑젤리", content: "대기는 있었지만 인생샷 건졌어요! 굿즈 라인업도 다양해서 구경하는 재미가 있었고, 직원분들도 친절하게 안내해주셔서 좋았습니다. 다음에 또 방문하고 싶어요.", date: "26.07.10", rating: 4.9, photos: ["p1", "p2"] },
  { id: "2", popupName: "무신사 스탠다드", nickname: "성수러버", content: "굿즈 퀄리티가 예상보다 좋았어요", date: "26.07.09", rating: 4.7 },
  { id: "3", popupName: "포켓몬 스토어", nickname: "포켓몬마스터", content: "아이랑 가기 딱 좋아요 강추", date: "26.07.08", rating: 5.0, photos: ["p1"] },
  { id: "4", popupName: "탬버린즈", nickname: "향수덕후", content: "향 체험존이 인상적이었어요", date: "26.07.07", rating: 4.6 },
];

// TODO(백엔드 연동): 실제 리뷰 생성 API로 교체해주세요.
// 지금은 백엔드 없이도 화면 흐름(작성 → 목록 반영)을 확인할 수 있도록
// 메모리상의 mock 배열에 바로 추가합니다. (새로고침하면 초기화돼요)
export function addReview(review: ReviewItem) {
  reviews.unshift(review);
}

/** 특정 브랜드에 속한 팝업들을 진행중/완료로 나눠 반환합니다. */
export function getPopupsByBrand(brandId: string): {
  ongoing: PopupItem[];
  ended: PopupItem[];
} {
  const all = [...recentPopups, ...popularPopups, ...openingSoonPopups, ...freePopups];
  const brandPopups = all.filter((item) => item.brandId === brandId);
  return {
    ongoing: brandPopups.filter((item) => item.status !== POPUP_STATUS.CLOSED),
    ended: brandPopups.filter((item) => item.status === POPUP_STATUS.CLOSED),
  };
}