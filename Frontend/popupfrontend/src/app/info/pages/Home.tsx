import { useNavigate } from "react-router";
import {
  CheckCircle, ArrowRight, MapPin, Calendar, Users, TrendingUp, Shield, Headphones,
  Store, CalendarClock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// 2번째 섹션: 핵심 기능 2종 요약 카드 (좌: 팝업콘텐츠 등록 / 우: 예약·웨이팅 통합관리)
const CORE_FEATURES = [
  {
    icon: Store,
    label: "Popup Contents",
    title: "팝업콘텐츠 등록",
    desc: "팝업 정보·이미지를 등록하면 관리자 심사를 거쳐 소비자 서비스에 바로 게시됩니다. 주소는 지도 좌표로 자동 변환되어 탐색 지도에 노출돼요.",
    points: ["팝업 정보·이미지 등록 폼", "심사/게시 상태 실시간 확인", "게시 즉시 소비자 앱 노출"],
    to: "/content-register",
    cta: "팝업콘텐츠 등록 안내",
  },
  {
    icon: CalendarClock,
    label: "Reservation & Waiting",
    title: "예약·웨이팅 통합관리",
    desc: "사전예약·현장 예약·비회원 예약을 하나의 시스템으로 받고, 실시간 대기열 현황과 재고 데이터까지 한 화면에서 관리합니다.",
    points: ["사전·현장·비회원 예약 통합", "실시간 대기열 관제·호출", "슬롯 정원·재고 데이터 관리"],
    to: "/waiting-management",
    cta: "예약·웨이팅 통합관리 안내",
  },
];

const SERVICES = [
  {
    icon: MapPin,
    title: "프리미엄 공간 네트워크",
    desc: "서울·수도권 주요 상권 300여 곳의 검증된 팝업 공간을 단일 플랫폼에서 탐색하고 예약할 수 있습니다.",
    stat: "300+",
    statLabel: "파트너 공간",
  },
  {
    icon: Calendar,
    title: "일정 관리 대시보드",
    desc: "예약부터 철수까지 전 일정을 시각화된 캘린더로 관리하고, 팀원과 실시간으로 공유하세요.",
    stat: "100%",
    statLabel: "실시간 동기화",
  },
  {
    icon: Users,
    title: "전담 매니저 배정",
    desc: "등록 완료 후 24시간 이내에 전담 플랫폼 매니저가 배정되어 첫 팝업 오픈까지 동행합니다.",
    stat: "24h",
    statLabel: "매니저 배정",
  },
  {
    icon: TrendingUp,
    title: "데이터 기반 인사이트",
    desc: "방문객 트래픽, 매출 추이, 브랜드 노출 지표를 자동 집계해 다음 팝업 전략 수립에 활용하세요.",
    stat: "15+",
    statLabel: "핵심 분석 지표",
  },
  {
    icon: Shield,
    title: "계약·보험 원스톱",
    desc: "공간 임대 계약서 작성과 단기 영업 보험 가입을 플랫폼 내에서 완결할 수 있습니다.",
    stat: "3일",
    statLabel: "계약 완료 기간",
  },
  {
    icon: Headphones,
    title: "운영 중 긴급 지원",
    desc: "팝업 운영 기간 동안 시설 트러블·민원 대응을 위한 긴급 콜센터를 24시간 운영합니다.",
    stat: "24/7",
    statLabel: "긴급 대응",
  },
];

const CASES = [
  {
    brand: "MINU Studio",
    category: "패션 액세서리",
    location: "성수동 S-Factory",
    duration: "7일",
    visitors: "4,200명",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop&auto=format",
    quote: "플랫폼 없이는 성수동 핫스팟에 자리 잡는 것 자체가 불가능했을 거예요.",
  },
  {
    brand: "Botanica Seoul",
    category: "라이프스타일",
    location: "홍대 복합문화공간",
    duration: "14일",
    visitors: "9,800명",
    img: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=400&fit=crop&auto=format",
    quote: "매니저님이 계약부터 철수까지 전 과정을 옆에서 도와주셨어요.",
  },
  {
    brand: "Gravure Archive",
    category: "아트 프린트",
    location: "강남 플래그십 빌딩",
    duration: "5일",
    visitors: "2,600명",
    img: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop&auto=format",
    quote: "데이터 리포트 덕분에 다음 팝업 기획이 훨씬 쉬워졌습니다.",
  },
];

const PLANS = [
  {
    name: "스타터",
    price: "무료",
    priceNote: "첫 1건 한정",
    features: ["공간 탐색 무제한", "전담 매니저 1회 배정", "기본 운영 리포트", "이메일 지원"],
    cta: "무료로 시작",
    highlight: false,
  },
  {
    name: "그로스",
    price: "월 89,000원",
    priceNote: "연 결제 시 20% 할인",
    features: ["공간 탐색 무제한", "전담 매니저 상시 배정", "고급 분석 대시보드", "계약·보험 원스톱", "24/7 긴급 지원", "월간 인사이트 리포트"],
    cta: "그로스 시작",
    highlight: true,
  },
  {
    name: "엔터프라이즈",
    price: "별도 협의",
    priceNote: "팀 규모에 맞춤 구성",
    features: ["그로스 전체 포함", "복수 팀 계정 관리", "API 연동", "전용 온보딩 교육", "전략 컨설팅 세션"],
    cta: "문의하기",
    highlight: false,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 주최자 등록은 회원가입 3단계 플로우에 통합됨
  const handleOrganizerBtn = () => {
    if (user) navigate("/seller");
    else navigate("/login", { state: { tab: "signup" } });
  };

  return (
    <main>
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-accent mb-8 border border-accent/30 rounded-sm px-3 py-1.5"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              팝업스토어 중개 플랫폼
            </div>
            <h1
              className="text-4xl lg:text-6xl font-semibold leading-tight tracking-tight mb-6"
              style={{ fontFamily: "'Noto Serif KR', serif", lineHeight: "1.2" }}
            >
              팝업스토어,<br />
              이제 플랫폼으로<br />
              <span className="text-accent">더 쉽게.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10 max-w-md">
              공간 탐색부터 계약, 운영 지원, 데이터 분석까지 — 팝업온은 팝업스토어 주최자에게 필요한 모든 것을 한 곳에서 제공합니다.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleOrganizerBtn}
                className="inline-flex items-center gap-2 bg-foreground text-primary-foreground px-6 py-3 rounded-sm text-sm font-medium hover:bg-accent transition-colors duration-200"
              >
                주최자로 등록하기
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate("/content-register")}
                className="inline-flex items-center gap-2 border border-foreground/30 px-6 py-3 rounded-sm text-sm font-medium hover:border-foreground transition-colors duration-200"
              >
                팝업콘텐츠 등록 →
              </button>
            </div>
            <div className="mt-12 flex gap-8">
              {[
                { value: "300+", label: "파트너 공간" },
                { value: "1,200+", label: "등록 주최자" },
                { value: "98%", label: "재이용률" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-2xl font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-sm overflow-hidden aspect-[4/3] bg-muted">
              <img
                src="https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=900&h=700&fit=crop&auto=format"
                alt="팝업스토어 내부 전경"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-8 bg-card border border-border rounded-sm p-4 shadow-lg w-52">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>실시간 예약 현황</span>
              </div>
              <div className="text-sm font-semibold">성수동 S-Factory</div>
              <div className="text-xs text-accent font-medium mt-0.5">2025.08.14 — 08.21 확정</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
      </section>

      {/* ── CORE FEATURES (팝업콘텐츠 등록 / 예약·웨이팅 통합관리) ── */}
      <section className="py-24 lg:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-14">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Core Features</div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              팝업 운영의 시작과 현장,<br />두 가지 도구로 해결하세요
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {CORE_FEATURES.map(({ icon: Icon, label, title, desc, points, to, cta }) => (
              <div key={title} className="bg-card border border-border rounded-sm p-8 lg:p-10 flex flex-col hover:border-accent/40 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-sm bg-accent/10 flex items-center justify-center">
                    <Icon size={20} className="text-accent" />
                  </div>
                  <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{label}</span>
                </div>
                <h3 className="text-xl lg:text-2xl font-semibold mb-3" style={{ fontFamily: "'Noto Serif KR', serif" }}>{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{desc}</p>
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={14} className="shrink-0 mt-0.5 text-accent" />
                      <span className="text-muted-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(to)}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-sm text-sm font-medium border border-foreground hover:bg-foreground hover:text-primary-foreground transition-colors duration-200"
                >
                  {cta}
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Platform Services</div>
              <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                주최자를 위한<br />6가지 핵심 서비스
              </h2>
            </div>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed lg:text-right">
              팝업온의 전담 매니저가 처음부터 끝까지 함께합니다. 브랜드의 스토리를 공간으로 만드는 일, 우리가 도와드립니다.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {SERVICES.map(({ icon: Icon, title, desc, stat, statLabel }) => (
              <div key={title} className="bg-card p-8 group hover:bg-secondary transition-colors duration-200">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>{stat}</div>
                    <div className="text-xs text-muted-foreground">{statLabel}</div>
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CASES ────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Success Stories</div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              팝업온과 함께한<br />브랜드 이야기
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {CASES.map(({ brand, category, location, duration, visitors, img, quote }) => (
              <div key={brand} className="group overflow-hidden rounded-sm border border-border bg-card hover:border-accent/40 transition-colors duration-300">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img src={img} alt={brand} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-accent font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{category}</span>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{duration}</span>
                  </div>
                  <h3 className="font-semibold text-base mb-1">{brand}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <MapPin size={11} />
                    <span>{location}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-5 p-3 bg-secondary rounded-sm">
                    <Users size={13} className="text-accent shrink-0" />
                    <span className="text-sm font-semibold">{visitors}</span>
                    <span className="text-xs text-muted-foreground">방문객</span>
                  </div>
                  <blockquote className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/40 pl-3 italic">
                    "{quote}"
                  </blockquote>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16 text-center">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Pricing Plans</div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              브랜드 규모에 맞는<br />요금제를 선택하세요
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, priceNote, features, cta, highlight }) => (
              <div
                key={name}
                className={`rounded-sm p-8 border flex flex-col ${highlight ? "bg-foreground text-primary-foreground border-foreground" : "bg-card border-border"}`}
              >
                <div className="mb-6">
                  <div className={`text-xs font-medium tracking-widest uppercase mb-3 ${highlight ? "text-accent" : "text-muted-foreground"}`} style={{ fontFamily: "'DM Mono', monospace" }}>{name}</div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>{price}</div>
                  <div className={`text-xs mt-1 ${highlight ? "text-white/50" : "text-muted-foreground"}`}>{priceNote}</div>
                </div>
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={14} className="shrink-0 mt-0.5 text-accent" />
                      <span className={highlight ? "text-white/80" : "text-muted-foreground"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleOrganizerBtn}
                  className={`w-full py-3 rounded-sm text-sm font-medium transition-colors duration-200 ${highlight ? "bg-accent text-white hover:bg-accent/90" : "border border-foreground hover:bg-foreground hover:text-primary-foreground"}`}
                >
                  {cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-20 bg-foreground text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold mb-4" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            지금 주최자로 등록하고<br />첫 팝업을 시작하세요
          </h2>
          <p className="text-white/60 text-sm mb-8">1영업일 이내 검토 · 24시간 내 전담 매니저 배정</p>
          <button
            onClick={handleOrganizerBtn}
            className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-sm text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
          >
            {user ? "주최자센터 바로가기" : "주최자 회원가입 하기"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  );
}
