export type PopupItem = {
  id: string;
  name: string;
  category?: string; // 검색 필터용 카테고리 (뷰티/패션/애니/푸드/스포츠/라이프/굿즈)
  hashtags?: string[]; // 실제 백엔드 popup_hashtag 데이터 (있으면 category보다 이걸 우선 씀)
  regionId?: number | null; // 실제 백엔드 region(동네 단위) id - 정확한 지역 필터링용
  dateRange?: string;
  location?: string;
  badge?: string;
  brandId?: string; // data/mockBrands.ts의 Brand.id와 연결
  status?: "예정" | "진행중" | "종료";
};

export type ReviewItem = {
  id: string;
  popupId: string; // 상세페이지(/popup/[id])로 이동할 때 씀
  popupName: string;
  nickname: string;
  content: string;
  date: string;
  rating: number;
  photos?: string[]; // 사진 URL 배열 (없으면 사진 없는 후기)
  status?: PopupItem["status"]; // 이 후기가 달린 팝업의 현재 상태 (예정/진행중/종료)
  region?: string; // 팝업 지역 태그 (예: "성수")
  category?: string; // 팝업 카테고리 태그 (예: "뷰티")
  reviewCount?: number; // 이 팝업에 달린 전체 후기 개수
};

export const promoCards = [
  { id: "1", title: "프로모션 카드 1" },
  { id: "2", title: "프로모션 카드 2" },
  { id: "3", title: "프로모션 카드 3" },
  { id: "4", title: "프로모션 카드 4" },
  { id: "5", title: "프로모션 카드 5" },
  { id: "6", title: "프로모션 카드 6" },
  { id: "7", title: "프로모션 카드 7" },
];

export const categories = [
  "성수 뷰티", "용산 애니", "성수 문구", "더현대 굿즈", "홍대 애니", "성수 문구", "더현대 굿즈",
];

// 최근 본 팝업 (8개)
export const recentPopups: PopupItem[] = [
  { id: "1", name: "스타벅스 서머", category: "푸드", status: "진행중" },
  { id: "2", name: "아더에러", category: "패션", status: "진행중" },
  { id: "3", name: "탬버린즈", category: "뷰티", brandId: "tamburins", status: "진행중" },
  { id: "4", name: "무신사 스탠다드", category: "패션", brandId: "musinsa", status: "진행중" },
  { id: "5", name: "산리오 카페", category: "애니", brandId: "sanrio", status: "진행중" },
  { id: "6", name: "이니스프리 그린랩", category: "뷰티", status: "진행중" },
  { id: "7", name: "러쉬 스파", category: "뷰티", status: "진행중" },
  { id: "8", name: "코카콜라 서머", category: "푸드", status: "진행중" },
];

// 곧 오픈하는 팝업 (8개)
export const openingSoonPopups: PopupItem[] = [
  { id: "1", name: "포켓몬 스토어", category: "애니", dateRange: "26.08.07 ~ 26.08.13", location: "성수", badge: "D-1", brandId: "pokemon", status: "예정" },
  { id: "2", name: "젠틀몬스터", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", badge: "D-1", status: "예정" },
  { id: "3", name: "빈폴 팝업", category: "패션", dateRange: "26.08.08 ~ 26.08.14", location: "여의도", badge: "D-2", status: "예정" },
  { id: "4", name: "나이키 런닝", category: "스포츠", dateRange: "26.08.08 ~ 26.08.14", location: "성수", badge: "D-2", status: "예정" },
  { id: "5", name: "어글리덕", category: "패션", dateRange: "26.08.09 ~ 26.08.15", location: "용산", badge: "D-3", status: "예정" },
  { id: "6", name: "컨버스 하우스", category: "패션", dateRange: "26.08.09 ~ 26.08.15", location: "여의도", badge: "D-3", status: "예정" },
  { id: "7", name: "뉴발란스 필드", category: "스포츠", dateRange: "26.08.10 ~ 26.08.16", location: "성수", badge: "D-4", status: "예정" },
  { id: "8", name: "폴로 랄프로렌", category: "패션", dateRange: "26.08.11 ~ 26.08.17", location: "홍대", badge: "D-5", status: "예정" },
];

// 무료입장 팝업 (8개)
export const freePopups: PopupItem[] = [
  { id: "1", name: "하이브 인사이트", category: "굿즈", dateRange: "26.08.07 ~ 26.08.13", location: "용산" },
  { id: "2", name: "LG 하우스", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "여의도" },
  { id: "3", name: "배스킨라빈스 팝업", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
  { id: "4", name: "다이슨 데모룸", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
  { id: "5", name: "삼성 갤럭시 스튜디오", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
  { id: "6", name: "오늘의집 라이프", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "여의도" },
  { id: "7", name: "요기요 키친", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "여의도" },
  { id: "8", name: "크록스 팝업", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수" },
];

// 실시간 인기 팝업 - 키워드(지역)별 TOP 10
export const popularByKeyword: Record<string, PopupItem[]> = {
  전체: [
    { id: "1", name: "무신사 스탠다드", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수", brandId: "musinsa", status: "진행중" },
    { id: "2", name: "산리오 카페", category: "애니", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", brandId: "sanrio", status: "진행중" },
    { id: "3", name: "디올 뷰티", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "4", name: "룰루레몬", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "5", name: "젠틀몬스터", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "6", name: "이니스프리 그린랩", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "7", name: "나이키 런닝", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "8", name: "러쉬 스파", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "9", name: "뉴발란스 필드", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "10", name: "코카콜라 서머", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
  ],
  성수: [
    { id: "1", name: "무신사 스탠다드", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수", brandId: "musinsa", status: "진행중" },
    { id: "2", name: "룰루레몬", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "3", name: "이니스프리 그린랩", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "4", name: "나이키 런닝", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "5", name: "코카콜라 서머", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "6", name: "다이슨 데모룸", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "7", name: "삼성 갤럭시 스튜디오", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "8", name: "스타일난다 스토어", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "9", name: "크록스 팝업", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
    { id: "10", name: "폴로 랄프로렌", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "성수", status: "진행중" },
  ],
  여의도: [
    { id: "2", name: "산리오 카페", category: "애니", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", brandId: "sanrio", status: "진행중" },
    { id: "9", name: "뉴발란스 필드", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "11", name: "LG 하우스", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "12", name: "배스킨라빈스 팝업", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "13", name: "오늘의집 라이프", category: "라이프", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "14", name: "요기요 키친", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "15", name: "하이브 인사이트", category: "굿즈", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "16", name: "컨버스 하우스", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "17", name: "어글리덕", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
    { id: "18", name: "빈폴 팝업", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "여의도", status: "진행중" },
  ],
  홍대: [
    { id: "3", name: "디올 뷰티", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "8", name: "러쉬 스파", category: "뷰티", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "5", name: "젠틀몬스터", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "19", name: "탬버린즈", category: "뷰티", brandId: "tamburins", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "20", name: "아더에러", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "21", name: "포켓몬 스토어", category: "애니", brandId: "pokemon", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "22", name: "빈폴 팝업", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "23", name: "스타벅스 서머", category: "푸드", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "24", name: "무신사 우먼", category: "패션", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
    { id: "25", name: "나이키 우먼스", category: "스포츠", dateRange: "26.08.07 ~ 26.08.13", location: "홍대", status: "진행중" },
  ],
};

// 기존 코드 호환용 (마이페이지/검색 등에서 "인기 팝업" 전체 목록이 필요할 때)
export const popularPopups: PopupItem[] = popularByKeyword["전체"];

export const reviews: ReviewItem[] = [
  { id: "1", popupId: "2", popupName: "산리오 카페", nickname: "말랑젤리", content: "대기는 있었지만 인생샷 건졌어요! 굿즈 라인업도 다양해서 구경하는 재미가 있었고, 직원분들도 친절하게 안내해주셔서 좋았습니다. 다음에 또 방문하고 싶어요.", date: "26.07.10", rating: 4.9, photos: ["p1", "p2"], status: "진행중", region: "성수", category: "굿즈", reviewCount: 32 },
  { id: "2", popupId: "1", popupName: "무신사 스탠다드", nickname: "성수러버", content: "굿즈 퀄리티가 예상보다 좋았어요", date: "26.07.09", rating: 4.7, status: "진행중", region: "성수", category: "패션", reviewCount: 18 },
  { id: "3", popupId: "1", popupName: "포켓몬 스토어", nickname: "포켓몬마스터", content: "아이랑 가기 딱 좋아요 강추", date: "26.07.08", rating: 5.0, photos: ["p1"], status: "예정", region: "잠실", category: "굿즈", reviewCount: 7 },
  { id: "4", popupId: "3", popupName: "탬버린즈", nickname: "향수덕후", content: "향 체험존이 인상적이었어요", date: "26.07.07", rating: 4.6, status: "진행중", region: "홍대", category: "뷰티", reviewCount: 20 },
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
  const all = [
    ...recentPopups,
    ...openingSoonPopups,
    ...freePopups,
    ...Object.values(popularByKeyword).flat(),
  ];
  const brandPopups = all.filter((item) => item.brandId === brandId);
  return {
    ongoing: brandPopups.filter((item) => item.status !== "종료"),
    ended: brandPopups.filter((item) => item.status === "종료"),
  };
}
