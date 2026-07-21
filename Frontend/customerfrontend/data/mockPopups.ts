export type PopupItem = {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  dateRange?: string;
  location?: string;
  badge?: string;
};

export type ReviewItem = {
  id: string;
  popupName: string;
  content: string;
  date: string;
  rating: number;
};

export const promoCards = [
  { id: "1", title: "프로모션 카드 1" },
  { id: "2", title: "프로모션 카드" },
  { id: "3", title: "프로모션 카드 3" },
];

export const categories = [
  "성수 뷰티", "용산 애니", "성수 문구", "더현대 굿즈", "홍대 애니", "성수 문구", "더현대 굿즈",
];

export const recentPopups: PopupItem[] = [
  { id: "1", name: "스타벅스 서머", brand: "스타벅스", brandId: "starbucks" },
  { id: "2", name: "아더에러", brand: "아더에러", brandId: "adererror" },
  { id: "3", name: "탬버린즈", brand: "탬버린즈", brandId: "tamburins" },
  { id: "4", name: "무신사 스탠다드", brand: "무신사", brandId: "musinsa" },
  { id: "5", name: "산리오 카페", brand: "산리오", brandId: "sanrio" },
];

export const popularPopups: PopupItem[] = [
  {
    id: "1",
    name: "무신사 스탠다드",
    brand: "무신사",
    brandId: "musinsa",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "성수",
    badge: "1",
  },
  {
    id: "2",
    name: "산리오 카페",
    brand: "산리오",
    brandId: "sanrio",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "여의도",
    badge: "2",
  },
  {
    id: "3",
    name: "디올 뷰티",
    brand: "디올",
    brandId: "dior",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "홍대",
    badge: "3",
  },
  {
    id: "4",
    name: "룰루레몬",
    brand: "룰루레몬",
    brandId: "lululemon",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "성수",
    badge: "4",
  },
];

export const openingSoonPopups: PopupItem[] = [
  { id: "1", name: "포켓몬 스토어", brand: "포켓몬", brandId: "pokémon", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "D-1" },
  { id: "2", name: "젠틀몬스터", brand: "젠틀몬스터", brandId: "gentlemonster", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", badge: "D-1" },
  { id: "3", name: "빈폴 팝업", brand: "빈폴", brandId: "bifun", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", badge: "D-1" },
  { id: "4", name: "나이키 런닝", brand: "나이키", brandId: "nike", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "D-1" },
  { id: "5", name: "어글리덕", brand: "어글리덕", brandId: "uglyduck", dateRange: "26.08.07 ~ 26.08.13", location: "용산", badge: "D-1" },
];

export const freePopups: PopupItem[] = [
  {
    id: "1",
    name: "하이브 인사이트",
    brand: "HYBE",
    brandId: "hybe",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "용산",
  },
  {
    id: "2",
    name: "LG 하우스",
    brand: "LG",
    brandId: "lg",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "여의도",
  },
  {
    id: "3",
    name: "배스킨라빈스 팝업",
    brand: "배스킨라빈스",
    brandId: "baskinrobbins",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "성수",
  },
  {
    id: "4",
    name: "스타벅스 서머",
    brand: "스타벅스",
    brandId: "starbucks",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "홍대",
  },
  {
    id: "5",
    name: "아더에러",
    brand: "아더에러",
    brandId: "adererror",
    dateRange: "26.08.07 ~ 26.08.13",
    location: "성수",
  },
];

export const reviews: ReviewItem[] = [
  { id: "1", popupName: "산리오 카페", content: "대기는 있었지만 인생샷 건졌어요!", date: "26.07.10", rating: 4.9 },
  { id: "2", popupName: "무신사 스탠다드", content: "굿즈 퀄리티가 예상보다 좋았어요", date: "26.07.09", rating: 4.7 },
  { id: "3", popupName: "포켓몬 스토어", content: "아이랑 가기 딱 좋아요 강추", date: "26.07.08", rating: 5.0 },
  { id: "4", popupName: "탬버린즈", content: "향 체험존이 인상적이었어요", date: "26.07.07", rating: 4.6 },
];