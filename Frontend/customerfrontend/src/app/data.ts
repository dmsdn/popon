// 소비자 서비스 공통 목업 데이터 (백엔드 연동 전 시뮬레이션용)

export const CATEGORIES = ["패션", "뷰티", "F&B", "캐릭터", "라이프스타일", "아트", "테크", "엔터테인먼트"];

export type Popup = {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  category: string;
  period: string;
  hours: string;
  location: string;
  area: string;
  image: string;
  rating: number;
  reviewCount: number;
  entry: "무료입장" | "사전예약제" | "현장대기";
  congestion: "여유" | "보통" | "혼잡";
  waitingTeams: number;
  intro: string;
  notice: string[];
  tags: string[];
  hot: boolean;
};

export const POPUPS: Popup[] = [
  {
    id: "pu-001", name: "무너의 여름방학 팝업", brand: "무너프렌즈", brandId: "br-001", category: "캐릭터",
    period: "07.10 — 07.27", hours: "매일 11:00 — 20:00", location: "성수 언더스탠드에비뉴 A동", area: "성수",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=600&fit=crop&auto=format",
    rating: 4.6, reviewCount: 812, entry: "사전예약제", congestion: "혼잡", waitingTeams: 23,
    intro: "무너와 함께 떠나는 여름방학! 한정판 굿즈 20종과 초대형 포토존, 미니게임 아케이드까지 준비했어요.",
    notice: ["반려동물 동반 불가 (안내견 제외)", "예약자 우선 입장, 현장 대기 병행", "굿즈 1인당 최대 5개 구매 제한"],
    tags: ["성수동팝업", "한정판굿즈", "포토존"], hot: true,
  },
  {
    id: "pu-002", name: "글로우랩 선케어 스튜디오", brand: "글로우랩", brandId: "br-002", category: "뷰티",
    period: "07.20 — 08.03", hours: "매일 10:30 — 21:00", location: "더현대 서울 B1 팝업존", area: "여의도",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop&auto=format",
    rating: 4.3, reviewCount: 204, entry: "무료입장", congestion: "보통", waitingTeams: 6,
    intro: "피부 타입 진단부터 나만의 선케어 루틴 설계까지. 무료 샘플 키트와 1:1 컨설팅을 제공합니다.",
    notice: ["피부 진단은 현장 선착순 접수", "미성년자는 보호자 동반 시 진단 가능"],
    tags: ["여의도팝업", "무료체험", "뷰티"], hot: true,
  },
  {
    id: "pu-003", name: "제주 감귤위크", brand: "제주스", brandId: "br-003", category: "F&B",
    period: "08.10 — 08.24", hours: "매일 11:00 — 21:00", location: "잠실 롯데월드몰 1F", area: "잠실",
    image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&h=600&fit=crop&auto=format",
    rating: 4.8, reviewCount: 96, entry: "현장대기", congestion: "여유", waitingTeams: 2,
    intro: "제주 햇감귤로 만든 시즌 한정 디저트 라인업. 감귤 착즙 클래스도 매일 2회 운영합니다.",
    notice: ["착즙 클래스는 현장 예약제 (회당 12명)", "알레르기 유발 성분 표시 확인"],
    tags: ["잠실팝업", "디저트", "시즌한정"], hot: false,
  },
  {
    id: "pu-004", name: "레트로 게임 아케이드전", brand: "픽셀컴퍼니", brandId: "br-004", category: "엔터테인먼트",
    period: "08.01 — 08.15", hours: "매일 12:00 — 22:00", location: "홍대 AK& 5F", area: "홍대",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&auto=format",
    rating: 4.4, reviewCount: 158, entry: "사전예약제", congestion: "보통", waitingTeams: 9,
    intro: "80~90년대 오락실을 그대로 옮겼습니다. 프리플레이 60분권으로 추억의 게임 40종을 즐기세요.",
    notice: ["입장권은 60분 단위 교체제", "만 19세 미만 22시 이후 입장 불가"],
    tags: ["홍대팝업", "레트로", "게임"], hot: true,
  },
  {
    id: "pu-005", name: "선셋 무드 향수전", brand: "센트카뮤", brandId: "br-005", category: "라이프스타일",
    period: "07.05 — 07.31", hours: "매일 11:00 — 20:30", location: "한남 블루스퀘어 네모", area: "한남",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=600&fit=crop&auto=format",
    rating: 4.7, reviewCount: 341, entry: "사전예약제", congestion: "보통", waitingTeams: 4,
    intro: "노을에서 영감받은 12가지 시그니처 향. 나만의 블렌딩 향수를 만드는 워크숍을 예약하세요.",
    notice: ["블렌딩 워크숍은 사전예약 필수", "향료 알레르기가 있는 분은 사전 문의"],
    tags: ["한남팝업", "향수", "워크숍"], hot: false,
  },
  {
    id: "pu-006", name: "K-웹툰 히어로즈전", brand: "툰스튜디오", brandId: "br-006", category: "아트",
    period: "08.12 — 09.01", hours: "매일 10:00 — 20:00", location: "홍대 AK& 5F 이벤트홀", area: "홍대",
    image: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=800&h=600&fit=crop&auto=format",
    rating: 0, reviewCount: 0, entry: "사전예약제", congestion: "여유", waitingTeams: 0,
    intro: "인기 웹툰 6작품의 원화 200점과 몰입형 미디어아트. 작가 사인회는 주말마다 열립니다.",
    notice: ["오픈 예정 — 사전예약 오픈 알림 신청 가능", "삼각대·플래시 촬영 금지"],
    tags: ["웹툰", "전시", "미디어아트"], hot: false,
  },
];

export type Review = {
  id: string; popupId: string; author: string; rating: number; date: string;
  content: string; likes: number; photos: number; verified: boolean;
};

export const REVIEWS: Review[] = [
  { id: "rv-1", popupId: "pu-001", author: "팝콘러버", rating: 5, date: "07.14", content: "포토존 미쳤어요… 30분 웨이팅이 아깝지 않음. 키링은 오픈런 필수!", likes: 42, photos: 3, verified: true },
  { id: "rv-2", popupId: "pu-001", author: "moon2", rating: 4, date: "07.13", content: "굿즈 퀄리티 좋아요. 다만 주말 오후는 정말 혼잡하니 오전 예약 추천.", likes: 28, photos: 1, verified: true },
  { id: "rv-3", popupId: "pu-001", author: "성수단골", rating: 4.5, date: "07.12", content: "미니게임에서 받은 쿠폰으로 음료 할인받았어요. 아이랑 가기 좋아요.", likes: 15, photos: 2, verified: false },
  { id: "rv-4", popupId: "pu-005", author: "향수덕후", rating: 5, date: "07.11", content: "블렌딩 워크숍 인생 체험. 내 향수 들고 나오는 순간 행복 그 자체.", likes: 67, photos: 4, verified: true },
];

export const BLOG_REVIEWS = [
  { title: "무너 팝업 웨이팅 꿀팁 총정리 (주차·굿즈 시세까지)", blog: "네이버 블로그 · 데일리성수", date: "07.13" },
  { title: "여름방학 팝업 3곳 비교 후기 — 무너가 1등인 이유", blog: "티스토리 · 팝업로그", date: "07.12" },
  { title: "아이와 함께 간 무너 팝업, 유모차 동선 후기", blog: "네이버 블로그 · 육아맘투어", date: "07.11" },
];

export type Reservation = {
  id: string; popupId: string; popupName: string; date: string; time: string;
  count: number; status: "확정" | "대기중" | "취소됨" | "이용완료";
};

export const MY_RESERVATIONS: Reservation[] = [
  { id: "R-90311", popupId: "pu-001", popupName: "무너의 여름방학 팝업", date: "2026-07-18 (토)", time: "14:00", count: 2, status: "확정" },
  { id: "R-90287", popupId: "pu-005", popupName: "선셋 무드 향수전", date: "2026-07-22 (수)", time: "16:00", count: 1, status: "대기중" },
  { id: "R-90102", popupId: "pu-002", popupName: "글로우랩 선케어 스튜디오", date: "2026-07-08 (수)", time: "13:00", count: 2, status: "이용완료" },
  { id: "R-89954", popupId: "pu-004", popupName: "레트로 게임 아케이드전", date: "2026-07-02 (목)", time: "19:00", count: 3, status: "취소됨" },
];

export const VISIT_HISTORY = [
  { popupName: "글로우랩 선케어 스튜디오", date: "07.08", reviewed: false },
  { popupName: "빈티지 바이닐 마켓", date: "05.11", reviewed: true },
  { popupName: "어반 가드닝 위크", date: "04.26", reviewed: true },
];

export const COUPONS = [
  { name: "무너 팝업 굿즈 10% 할인", from: "스탬프 미션 완료", until: "07.27", used: false },
  { name: "감귤위크 웰컴드링크 무료", from: "오픈 이벤트 당첨", until: "08.24", used: false },
  { name: "글로우랩 샘플키트 교환권", from: "설문 참여 리워드", until: "07.20", used: true },
];

export const NOTIFICATIONS = [
  { id: 1, type: "웨이팅", text: "무너의 여름방학 팝업 — 앞으로 3팀 남았어요! 매장 근처에서 대기해 주세요.", time: "방금 전", unread: true },
  { id: 2, type: "예약", text: "내일 14:00 「무너의 여름방학 팝업」 예약이 있어요. QR 티켓을 미리 확인하세요.", time: "2시간 전", unread: true },
  { id: 3, type: "오픈", text: "찜한 브랜드 툰스튜디오의 「K-웹툰 히어로즈전」 사전예약이 오픈됐어요.", time: "어제", unread: false },
  { id: 4, type: "이벤트", text: "감귤위크 오픈 이벤트 당첨! 쿠폰함에서 웰컴드링크 쿠폰을 확인하세요.", time: "07.12", unread: false },
];

export const EVENTS = [
  { id: "ev-1", title: "무너 팝업 인증샷 챌린지", desc: "포토존 인증샷을 해시태그와 함께 올리면 추첨을 통해 한정판 쿠션 증정", period: "07.10 — 07.27", state: "진행중", reward: "빅사이즈 쿠션 (10명)" },
  { id: "ev-2", title: "감귤위크 오픈 알림 이벤트", desc: "오픈 알림 신청만 해도 웰컴드링크 쿠폰 즉시 지급", period: "07.25 — 08.09", state: "진행중", reward: "웰컴드링크 쿠폰 (전원)" },
  { id: "ev-3", title: "향수전 후기 이벤트", desc: "포토 후기를 남기면 시그니처 미니어처 향수 추첨 증정", period: "07.05 — 07.31", state: "당첨자 발표", reward: "미니어처 향수 (20명)" },
];

export const BRANDS: Record<string, { name: string; desc: string; sns: string; history: { name: string; period: string; visitors: string }[] }> = {
  "br-001": {
    name: "무너프렌즈",
    desc: "\"뭐든 될 수 있어\" — 무너는 실패해도 다시 도전하는 Z세대의 아이콘입니다. 시즌마다 새로운 세계관의 팝업을 선보입니다.",
    sns: "@mooner.friends",
    history: [
      { name: "무너의 여름방학 팝업", period: "2026.07", visitors: "12,480명+" },
      { name: "무너 크리스마스 하우스", period: "2025.12", visitors: "31,200명" },
      { name: "무너의 편의점", period: "2025.08", visitors: "27,800명" },
    ],
  },
};

export const FAQS = [
  { q: "예약을 변경하거나 취소하고 싶어요.", a: "마이페이지 > 예약 관리에서 방문 24시간 전까지 날짜·시간·인원을 변경하거나 취소할 수 있습니다. 이후에는 팝업별 정책에 따라 제한될 수 있어요." },
  { q: "웨이팅 순서가 지나면 어떻게 되나요?", a: "호출 후 10분 내 미입장 시 자동 노쇼 처리됩니다. 같은 팝업에는 당일 1회 재등록이 가능합니다." },
  { q: "QR 티켓은 어디서 확인하나요?", a: "예약 상세 화면에서 QR 티켓을 확인할 수 있습니다. 입장 시 현장 스태프에게 제시해 주세요." },
  { q: "쿠폰은 어떻게 사용하나요?", a: "마이페이지 > 쿠폰함에서 사용 가능한 쿠폰을 확인하고, 현장 결제 시 바코드를 제시하면 적용됩니다." },
];

// 팝업 상세: 시간대별 혼잡도 및 예약 가능 여부
export const RESERVATION_HINT: { time: string; level: Popup["congestion"]; available: boolean }[] = [
  { time: "11:00", level: "여유", available: true },
  { time: "12:00", level: "보통", available: true },
  { time: "13:00", level: "혼잡", available: false },
  { time: "14:00", level: "혼잡", available: false },
  { time: "15:00", level: "보통", available: true },
  { time: "16:00", level: "보통", available: true },
  { time: "17:00", level: "여유", available: true },
  { time: "18:00", level: "여유", available: true },
];

export const CONGESTION_COLOR: Record<Popup["congestion"], string> = {
  여유: "text-emerald-600 bg-emerald-50 border-emerald-200",
  보통: "text-amber-600 bg-amber-50 border-amber-200",
  혼잡: "text-red-500 bg-red-50 border-red-200",
};
