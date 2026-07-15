import { useState } from "react";
import { TrendingUp, MapPin, Calendar, BookOpen, BarChart2, Users, ChevronRight, ArrowRight, Lightbulb, Star } from "lucide-react";
import { useNavigate } from "react-router";

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "trend", label: "트렌드 분석" },
  { id: "location", label: "상권 가이드" },
  { id: "operation", label: "운영 노하우" },
  { id: "data", label: "데이터 리포트" },
];

const ARTICLES = [
  {
    id: 1,
    category: "trend",
    categoryLabel: "트렌드 분석",
    title: "2025년 팝업스토어 트렌드 — '체험형'이 답이다",
    summary: "단순 판매를 넘어 소비자가 직접 참여하는 체험 프로그램을 갖춘 팝업이 평균 체류 시간 40% 증가. 브랜드 스토리텔링과 포토존의 결합이 핵심입니다.",
    readTime: "5분",
    date: "2025.07.10",
    img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&h=400&fit=crop&auto=format",
    featured: true,
  },
  {
    id: 2,
    category: "location",
    categoryLabel: "상권 가이드",
    title: "성수동 vs 홍대 vs 강남 — 팝업 상권 완전 비교",
    summary: "세 지역의 유동인구 특성, 임대 단가, 접근성을 분석해 브랜드 타깃에 맞는 최적 입지를 선택하는 방법을 정리했습니다.",
    readTime: "7분",
    date: "2025.07.05",
    img: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=400&fit=crop&auto=format",
    featured: false,
  },
  {
    id: 3,
    category: "operation",
    categoryLabel: "운영 노하우",
    title: "팝업 첫날 실수를 줄이는 체크리스트 20",
    summary: "반입 동선 사전 답사, 결제 단말기 사전 테스트, 직원 교육 등 오픈 D-day에 반드시 확인해야 할 20가지 항목을 공유합니다.",
    readTime: "6분",
    date: "2025.06.28",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop&auto=format",
    featured: false,
  },
  {
    id: 4,
    category: "data",
    categoryLabel: "데이터 리포트",
    title: "Q2 2025 팝업스토어 방문객 분석 리포트",
    summary: "팝업온 플랫폼 내 Q2 방문객 120만 건을 분석. 주말 오후 2-5시 피크, MZ세대 여성 비중 62%, SNS 유입 47% 등 주요 지표를 공개합니다.",
    readTime: "8분",
    date: "2025.07.01",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&auto=format",
    featured: true,
  },
  {
    id: 5,
    category: "trend",
    categoryLabel: "트렌드 분석",
    title: "팝업스토어와 SNS 마케팅의 시너지 전략",
    summary: "팝업 오픈 전 D-7 SNS 예열, 당일 스토리·릴스 활용법, 방문자 UGC(사용자 제작 콘텐츠) 확산 전략을 단계별로 정리합니다.",
    readTime: "5분",
    date: "2025.06.20",
    img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop&auto=format",
    featured: false,
  },
  {
    id: 6,
    category: "operation",
    categoryLabel: "운영 노하우",
    title: "단기 팝업 보험, 어떻게 선택해야 할까",
    summary: "화재·도난·배상책임 등 팝업 운영 시 필요한 보험 유형과 적정 보장 금액을 가이드합니다. 팝업온 원스톱 보험 서비스 활용법도 포함합니다.",
    readTime: "4분",
    date: "2025.06.15",
    img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop&auto=format",
    featured: false,
  },
];

const INFO_CARDS = [
  {
    icon: TrendingUp,
    title: "시장 트렌드",
    desc: "팝업스토어 시장 규모, 소비자 행동 변화, 업종별 성수기 데이터를 분기별로 업데이트합니다.",
    count: "월 2회 업데이트",
  },
  {
    icon: MapPin,
    title: "상권 인사이트",
    desc: "주요 상권의 유동인구, 임대 시세, 타깃 연령 분포를 분석해 최적 입지 선택을 도와드립니다.",
    count: "15개 상권 커버",
  },
  {
    icon: BookOpen,
    title: "운영 가이드",
    desc: "법무, 세무, 보험, 직원 고용까지 팝업 운영에 필요한 실무 지식을 알기 쉽게 정리합니다.",
    count: "50+ 가이드 문서",
  },
  {
    icon: BarChart2,
    title: "성과 벤치마크",
    desc: "같은 카테고리·규모의 팝업 평균 방문객 수, 매출, SNS 도달 수치를 익명으로 비교할 수 있습니다.",
    count: "카테고리별 5개 지표",
  },
];

const FAQ = [
  {
    q: "팝업스토어 운영에 별도 영업 허가가 필요한가요?",
    a: "식품을 판매하는 경우 식품위생법에 따른 임시 영업 신고가 필요합니다. 의류·잡화 등 일반 소매는 별도 허가 없이 사업자등록증만으로 운영 가능합니다. 팝업온 정보센터의 '법무 가이드' 섹션에서 업종별 상세 내용을 확인하세요.",
  },
  {
    q: "팝업 운영 기간 중 매출 데이터를 어떻게 확인하나요?",
    a: "팝업온 대시보드의 '운영 현황' 탭에서 실시간 방문객 수, 결제 건수, 시간대별 매출을 확인할 수 있습니다. 카드 단말기 연동 시 자동 집계되며, 엑셀 내보내기도 지원합니다.",
  },
  {
    q: "예약 없이 현장 방문만 가능한 팝업도 등록할 수 있나요?",
    a: "네, 가능합니다. 콘텐츠 등록 시 '예약 없이 자유 방문' 옵션을 선택하면 소비자에게 운영 시간만 노출됩니다. 추후 사전 예약제로 전환도 가능합니다.",
  },
  {
    q: "소비자가 팝업 당일 취소하면 어떻게 되나요?",
    a: "예약제 팝업의 경우 취소 정책은 주최자가 설정할 수 있습니다. 전일 취소 시 전액 환불, 당일 취소 시 50% 환불 등의 옵션을 선택할 수 있으며, 팝업온이 정책에 따라 자동 처리합니다.",
  },
  {
    q: "팝업 종료 후 정산은 언제 받나요?",
    a: "팝업 종료일 기준 영업일 5일 이내에 등록된 계좌로 정산됩니다. 정산 내역서는 대시보드에서 다운로드 가능하며, 세금계산서는 매월 말일 자동 발행됩니다.",
  },
];

export default function InfoCenter() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = activeCategory === "all" ? ARTICLES : ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <main>
      {/* ── PAGE HERO ────────────────────────────────────────── */}
      <section className="border-b border-border bg-foreground text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="text-xs font-medium tracking-widest uppercase text-accent mb-5" style={{ fontFamily: "'DM Mono', monospace" }}>Information Center</div>
          <div className="grid lg:grid-cols-2 gap-10 items-end">
            <div>
              <h1 className="text-3xl lg:text-5xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                팝업 주최자를 위한<br />정보센터
              </h1>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">
                시장 트렌드, 상권 분석, 운영 노하우, 법무·세무 가이드까지 — 팝업온이 주최자에게 필요한 실질적인 정보를 한 곳에 모았습니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "50+", label: "가이드 문서" },
                { value: "15곳", label: "상권 분석 커버" },
                { value: "분기별", label: "데이터 리포트" },
                { value: "전문가", label: "법무·세무 감수" },
              ].map(({ value, label }) => (
                <div key={label} className="p-4 border border-white/10 rounded-sm">
                  <div className="text-xl font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</div>
                  <div className="text-xs text-white/50 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INFO CARDS ────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {INFO_CARDS.map(({ icon: Icon, title, desc, count }) => (
              <div key={title} className="p-6 bg-card border border-border rounded-sm hover:border-accent/40 transition-colors group">
                <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                  <Icon size={18} className="text-accent" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{desc}</p>
                <div className="text-xs text-accent font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTICLES ─────────────────────────────────────────── */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl lg:text-3xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>최신 아티클</h2>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={`px-4 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                    activeCategory === id
                      ? "bg-foreground text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured articles */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {filtered.filter((a) => a.featured).map((article) => (
              <div key={article.id} className="group overflow-hidden rounded-sm border border-border bg-card hover:border-accent/40 transition-colors cursor-pointer">
                <div className="aspect-[16/8] overflow-hidden bg-muted">
                  <img src={article.img} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-accent font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{article.categoryLabel}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{article.readTime} 읽기</span>
                    <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-sm ml-auto">
                      <Star size={9} />
                      추천
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mb-2 leading-snug" style={{ fontFamily: "'Noto Serif KR', serif" }}>{article.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{article.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                    <span className="text-xs text-accent flex items-center gap-1 group-hover:gap-2 transition-all">읽기 <ChevronRight size={12} /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Regular articles */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.filter((a) => !a.featured).map((article) => (
              <div key={article.id} className="group overflow-hidden rounded-sm border border-border bg-card hover:border-accent/40 transition-colors cursor-pointer">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={article.img} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-accent font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{article.categoryLabel}</span>
                    <span className="text-xs text-muted-foreground">· {article.readTime}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug mb-2">{article.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
                  <div className="mt-3 text-xs text-muted-foreground">{article.date}</div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">해당 카테고리의 아티클이 없습니다.</div>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-secondary">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>FAQ</div>
            <h2 className="text-2xl lg:text-3xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>자주 묻는 질문</h2>
          </div>

          <div className="flex flex-col divide-y divide-border border border-border rounded-sm overflow-hidden bg-card">
            {FAQ.map(({ q, a }, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-start gap-4 px-6 py-5 text-left hover:bg-secondary transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <Lightbulb size={15} className="shrink-0 text-accent mt-0.5" />
                  <span className="flex-1 text-sm font-medium">{q}</span>
                  <span className="shrink-0 text-muted-foreground text-lg leading-none">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 pt-1">
                    <p className="text-sm text-muted-foreground leading-relaxed pl-7">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Noto Serif KR', serif" }}>더 궁금한 점이 있으신가요?</h3>
            <p className="text-sm text-muted-foreground">전담 매니저가 1:1로 답변드립니다.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/login", { state: { tab: "signup" } })}
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground px-6 py-3 rounded-sm text-sm font-medium hover:bg-accent transition-colors"
            >
              주최자 회원가입
              <ArrowRight size={16} />
            </button>
            <a
              href="mailto:hello@popupon.kr"
              className="inline-flex items-center gap-2 border border-foreground/30 px-6 py-3 rounded-sm text-sm font-medium hover:border-foreground transition-colors"
            >
              이메일 문의
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
