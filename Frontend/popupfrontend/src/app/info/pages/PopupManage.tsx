// 팝업 통합 관리 (7/30 신설 — ContentRegister + WaitingManagement 병합)
// 구성: 다크 원페이지 — 히어로 실시간 통계, 떠다니는 캡슐 이미지,
// 스크롤 리빌(IntersectionObserver), 좌우 교차 섹션, 원형 아이콘 그리드.
// 순서: ① 히어로 → ② 팝업 등록(절차·팁·확인사항) → ③ 예약·웨이팅 통합관리 → ④ 운영 흐름 → ⑤ CTA.
// 구 /content-register·/waiting-management 는 routes에서 이 페이지로 리다이렉트된다.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight, CheckCircle, Image as ImageIcon, FileText, Tag, MapPin, Clock,
  ChevronDown, ChevronUp, AlertCircle, CalendarCheck, Users, Package,
  MonitorSmartphone, BellRing, QrCode,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getPopups, getPopupImages, Popup } from "../../lib/api";

// ── 스크롤 리빌 — 화면에 들어오면 한 번만 페이드+슬라이드 업 ──
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); ob.disconnect(); } },
      { threshold: 0.15 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

// ── 콘텐츠 데이터 (구 두 페이지에서 그대로 이동 — 문구 무변경) ──

const STEPS = [
  {
    num: "01", icon: FileText, title: "팝업 기본 정보 입력",
    desc: "팝업스토어의 이름, 브랜드, 카테고리, 운영 기간을 입력합니다.",
    detail: [
      "팝업 이름은 소비자가 검색·탐색 시 노출되는 핵심 텍스트입니다. 브랜드명 + 콘셉트 키워드 조합을 권장합니다.",
      "카테고리는 패션, 뷰티, 식음료, 라이프스타일, 아트, 테크 중 선택하며, 복수 선택이 가능합니다.",
      "운영 기간은 시작일과 종료일을 포함하며 최소 1일, 최대 90일까지 등록 가능합니다.",
    ],
  },
  {
    num: "02", icon: MapPin, title: "공간 및 위치 연결",
    desc: "팝업온 파트너 공간 중 운영할 장소를 선택하거나 직접 주소를 입력합니다.",
    detail: [
      "파트너 공간을 선택하면 층별 도면, 시설 정보, 반입 규정이 자동으로 연동됩니다.",
      "직접 주소 입력 시 주최자가 직접 계약한 공간에서 팝업온 플랫폼을 활용할 수 있습니다.",
      "지도 핀 위치는 소비자용 서비스 페이지에 그대로 노출되므로 정확히 입력해 주세요.",
    ],
  },
  {
    num: "03", icon: ImageIcon, title: "비주얼 콘텐츠 업로드",
    desc: "대표 이미지, 공간 사진, 제품 사진 등 팝업을 소개하는 이미지를 등록합니다.",
    // 7/29 — 실제 등록 폼·서버 리사이즈 규격과 일치하도록 정정 (PopupRegister THUMB_SPEC/DETAIL_SPEC 참고)
    detail: [
      "이미지는 JPG 형식, 장당 최대 10MB까지 업로드할 수 있습니다.",
      "썸네일은 800×800 정사각, 상세 이미지는 1080×1440 세로형으로 서버가 자동 변환합니다.",
      "썸네일·상세 이미지 모두 여러 장(각 최대 20장) 등록할 수 있고, 올린 순서대로 노출됩니다.",
    ],
  },
  {
    num: "04", icon: Tag, title: "상세 설명 및 해시태그",
    desc: "팝업의 콘셉트, 판매 상품, 특별 이벤트 등을 소개하는 상세 설명을 작성합니다.",
    detail: [
      "상세 설명은 최대 2,000자이며 마크다운 형식을 지원합니다 (굵게, 목록, 소제목 등).",
      "해시태그는 최대 10개까지 등록 가능하며 소비자 검색 결과 노출에 영향을 미칩니다.",
      "자주 검색되는 태그 예시: #성수동팝업 #한정판 #포토존 #굿즈 #무료입장",
    ],
  },
  {
    num: "05", icon: Clock, title: "운영 시간 및 입장 정보",
    desc: "매일 운영 시간, 입장료, 사전 예약 필요 여부 등 방문자 정보를 설정합니다.",
    detail: [
      "요일별로 다른 운영 시간을 설정할 수 있습니다 (예: 평일 11-20시, 주말 10-21시).",
      "사전 예약제 운영 시 팝업온의 예약 시스템과 연동하여 정원 관리가 가능합니다.",
      "입장료가 있는 경우 온라인 결제 연동을 별도 신청하시면 선매출도 가능합니다.",
    ],
  },
  {
    num: "06", icon: CheckCircle, title: "검토 요청 및 게시",
    desc: "모든 정보를 입력한 뒤 '게시 요청'을 클릭하면 운영팀이 24시간 내 검토합니다.",
    detail: [
      "검토 기준: 이미지 품질, 정보의 정확성, 플랫폼 운영 정책 준수 여부를 확인합니다.",
      "승인 완료 시 소비자용 서비스 페이지에 팝업이 자동으로 노출됩니다.",
      "수정이 필요한 경우 담당 매니저가 이메일로 가이드를 제공합니다.",
    ],
  },
];

const TIPS = [
  {
    title: "대표 이미지 품질이 클릭률을 결정합니다",
    body: "내부 데이터 기준, 고품질 대표 이미지를 사용한 팝업은 평균 클릭률이 2.3배 높습니다. 밝고 선명한 공간 사진 또는 시그니처 제품 사진을 첫 번째로 배치하세요.",
  },
  {
    title: "해시태그는 지역명 + 콘셉트 조합이 효과적",
    body: "#성수팝업 #홍대팝업처럼 지역명을 포함한 태그는 근거리 소비자에게 우선 노출됩니다. 브랜드 고유 태그를 하나 포함하면 SNS 연계 효과도 기대할 수 있습니다.",
  },
  {
    title: "운영 시간 변경은 24시간 전에",
    body: "운영 시간을 변경해야 할 경우 방문 예정 소비자에게 알림이 자동 발송됩니다. 변경은 당일 운영 시작 24시간 전까지만 가능하니 사전에 확인해 주세요.",
  },
  {
    title: "사전 예약제는 방문 밀도를 높입니다",
    body: "사전 예약제를 도입하면 피크 시간대 혼잡을 줄이고, 방문자 데이터(연령·성별·지역)를 수집할 수 있습니다. 소규모 공간일수록 예약제 전환 효과가 큽니다.",
  },
];

const REQUIREMENTS = [
  { label: "필수 제출 서류", items: ["사업자등록증 사본", "팝업 기획서 (간단한 형식 가능)", "대표자 신분증"] },
  /* 7/29 — 실제 규격으로 정정: JPG만 받고, 서버가 썸네일 800×800·상세 1080×1440으로 변환한다 */
  { label: "이미지 규격", items: ["파일 형식: JPG (장당 최대 10MB)", "썸네일: 800×800 정사각으로 자동 변환", "상세 이미지: 1080×1440 세로형으로 자동 변환"] },
  { label: "등록 불가 콘텐츠", items: ["주류·담배 단독 판매", "의약품·의료기기 무허가 판매", "저작권 침해 상품 판매"] },
  { label: "운영 정책", items: ["최소 운영 기간 1일", "공간 반납 기준 시간 준수", "소비자 환불 정책 사전 명시"] },
];

// 예약·웨이팅 핵심 기능 3종 — 좌우 교차 섹션으로 배치
const WAITING_FEATURES = [
  {
    icon: CalendarCheck, title: "모든 예약 유형을 하나로",
    desc: "사전예약·현장 예약·비회원 예약까지 예약 방식이 달라도 하나의 명단으로 통합 관리됩니다. 채널별로 나뉜 엑셀 정리는 이제 그만.",
    points: ["시간대별 슬롯 정원 설정", "사전예약 + 현장 접수 통합 명단", "비회원도 이름·연락처만으로 등록"],
    cta: { label: "예약 슬롯·명단 관리하기", path: "/seller/reservations" },
  },
  {
    icon: Users, title: "실시간 대기열 현황",
    desc: "현장 대기팀 수·순번을 실시간으로 관제하고, 호출·노쇼 처리를 버튼 하나로. 방문객은 원격 줄서기로 매장 밖에서 기다립니다.",
    points: ["원격 줄서기(웨이팅 등록)", "호출·노쇼 원클릭 처리", "순서 임박 자동 알림 발송"],
    cta: { label: "대기열·인원 관제 열기", path: "/seller/waiting" },
  },
  {
    icon: Package, title: "방문 데이터 관리",
    /* 7/29 정정 유지 — 굿즈·재고 관리는 기능 탈락. 실제 제공하는 방문 통계 기능으로 서술 */
    desc: "슬롯 정원과 방문 데이터를 숫자로 관리합니다. 입장 인원과 방문 흐름이 기록으로 남아 다음 팝업 기획의 근거가 됩니다.",
    points: ["슬롯별 예약율·잔여석 집계", "방문자 연령·성별 분포 통계", "기간별 방문 추이·예약 전환율 리포트"],
    cta: { label: "방문 통계 보러가기", path: "/seller/performance" },
  },
];

const FLOW = [
  { step: "01", icon: CalendarCheck, title: "슬롯 설정", desc: "날짜·시간대별 예약 정원을 등록" },
  { step: "02", icon: MonitorSmartphone, title: "예약 접수", desc: "소비자 앱 사전예약 + 현장·비회원 접수" },
  { step: "03", icon: BellRing, title: "실시간 관제", desc: "대기열 호출·노쇼 처리, 순번 알림" },
  { step: "04", icon: QrCode, title: "입장 체크인", desc: "QR 스캔으로 입장 확인, 데이터 자동 축적" },
];

// 떠다니는 캡슐 배치 — 실제 팝업 썸네일을 화면 양쪽에 흩뿌린다
const CAPSULE_POS = [
  { top: "6%", left: "4%", w: 150, delay: 0 },
  { top: "18%", left: "16%", w: 190, delay: 1.2 },
  { top: "58%", left: "2%", w: 130, delay: 2.1 },
  { top: "72%", left: "15%", w: 170, delay: 0.6 },
  { top: "8%", right: "14%", w: 160, delay: 1.7 },
  { top: "30%", right: "3%", w: 200, delay: 0.3 },
  { top: "62%", right: "16%", w: 180, delay: 2.4 },
  { top: "80%", right: "4%", w: 140, delay: 1.0 },
];

export default function PopupManage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [openStep, setOpenStep] = useState<number | null>(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [capsules, setCapsules] = useState<string[]>([]); // 떠다니는 썸네일 URL들

  // 히어로 통계·캡슐용 실데이터 (공개 API — 로그인 불필요)
  useEffect(() => {
    let cancelled = false;
    getPopups()
      .then(async (all) => {
        if (cancelled) return;
        const visible = all.filter((p) => ["OPEN", "BEFOR", "CLOSED"].includes(p.status));
        setPopups(visible);
        const targets = visible.filter((p) => p.status !== "CLOSED").slice(0, CAPSULE_POS.length);
        const urls = await Promise.all(
          targets.map((p) =>
            getPopupImages(p.id, "THUMBNAIL").then((im) => im[0]?.imageUrl).catch(() => undefined),
          ),
        );
        if (!cancelled) setCapsules(urls.filter((u): u is string => !!u));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // /manage#waiting 처럼 해시로 들어오면 해당 섹션으로 스크롤 (Home 바로가기·구경로 리다이렉트용)
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 80);
  }, [location.hash]);

  const openCount = useMemo(() => popups.filter((p) => p.status === "OPEN").length, [popups]);

  const goManage = (path: string) => {
    if (user) navigate(path);
    else navigate("/login", { state: { from: path } });
  };

  const scrollToRegister = () => document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="bg-background text-foreground">
      {/* 캡슐 부유 애니메이션 — 이미지가 천천히 떠다닌다 */}
      <style>{`
        @keyframes popupFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
      `}</style>

      {/* ── ① HERO — 로고·태그라인·실시간 숫자·큰 CTA ── */}
      <section className="relative overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-16 lg:pt-32 lg:pb-20 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-sm bg-accent flex items-center justify-center">
                <span className="text-accent-foreground text-base font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
              </div>
              {/* 페이지의 유일한 h1 — 스크린 리더·검색엔진이 이 페이지의 주제로 읽는 제목 */}
              <h1 className="text-2xl font-extrabold text-foreground tracking-wide" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>팝업 통합 관리</h1>
            </div>
            <p className="text-xl lg:text-2xl text-foreground/90 leading-relaxed mb-8">
              팝업 등록부터 예약·웨이팅 관제까지,<br />운영의 전 과정을 한곳에서.
            </p>

            {/* 실시간 숫자 — 실제 팝업 DB 집계 */}
            <div className="flex gap-12 mb-9">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] tracking-widest text-muted-foreground mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" /> 등록된 팝업
                </div>
                <div className="text-3xl font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{popups.length.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] tracking-widest text-muted-foreground mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 지금 진행중
                </div>
                <div className="text-3xl font-extrabold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{openCount.toLocaleString()}</div>
              </div>
            </div>

            <button
              onClick={() => (user ? navigate("/seller/popups/new") : navigate("/signup"))}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-medium px-8 py-4 rounded-sm hover:brightness-110 transition-all"
            >
              {user ? "팝업 등록 시작하기" : "주최자 가입하고 시작하기"}
              <ArrowRight size={16} />
            </button>
            <p className="mt-3 text-xs text-muted-foreground">사업자 인증 주최자라면 지금 바로 등록할 수 있습니다.</p>
          </Reveal>

          {/* 우측 일러스트 자리 — 실제 팝업 썸네일 3장 겹치기 */}
          <Reveal delay={150} className="hidden lg:block">
            <div className="relative h-[340px]">
              {capsules.slice(0, 3).map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="absolute rounded-md shadow-2xl shadow-black/50 object-cover"
                  style={{
                    width: 240 - i * 30, height: 240 - i * 30,
                    top: i * 44, right: i * 110,
                    zIndex: 3 - i, opacity: 1 - i * 0.25,
                    animation: `popupFloat ${6 + i}s ease-in-out ${i * 0.8}s infinite`,
                  }}
                />
              ))}
              {capsules.length === 0 && (
                <div className="absolute inset-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-sm text-muted-foreground">
                  등록된 팝업 이미지가 이 자리에 노출됩니다
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* LEARN MORE — 아래 구간으로 스크롤 유도 */}
        <button onClick={scrollToRegister} className="block mx-auto pb-8 text-center text-[11px] tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors">
          LEARN MORE
          <ChevronDown size={18} className="mx-auto mt-1 animate-bounce" />
        </button>
      </section>

      {/* ── ② 팝업 등록 파트 ─────────────────────────────────── */}
      {/* ②-a 흩어진 캡슐 + 중앙 카피 */}
      <section id="register" className="relative overflow-hidden py-28 lg:py-40">
        {capsules.map((url, i) => {
          const pos = CAPSULE_POS[i];
          if (!pos) return null;
          return (
            <img
              key={url + i}
              src={url}
              alt=""
              className="absolute rounded shadow-lg shadow-black/40 object-cover opacity-70 hidden md:block"
              style={{
                width: pos.w, height: pos.w * 0.62,
                top: pos.top, left: pos.left, right: pos.right,
                animation: `popupFloat ${5.5 + (i % 3)}s ease-in-out ${pos.delay}s infinite`,
              }}
            />
          );
        })}
        <Reveal className="relative max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-5" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
            팝업을 소비자 앞에, 즉시
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground leading-relaxed mb-6">
            등록한 팝업은 관리자 심사를 거쳐 소비자 서비스에 바로 게시됩니다.
            주소는 지도 좌표로 자동 변환되어 탐색 지도에 노출되고,
            등록 순간부터 예약·웨이팅 도구가 함께 활성화됩니다.
          </p>
          <button onClick={() => (user ? navigate("/seller/popups/new") : navigate("/login"))} className="text-accent text-sm hover:brightness-125 inline-flex items-center gap-1">
            {user ? "주최자센터에서 등록하기" : "로그인 후 등록하기"} <ArrowRight size={14} />
          </button>
        </Reveal>
      </section>

      {/* ②-b 6단계 등록 절차 (아코디언 유지 — 다크 재스타일) */}
      <section className="py-20 lg:py-24 bg-card">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Step by Step</div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>6단계 등록 절차</h2>
          </Reveal>

          <Reveal>
            <div className="flex flex-col divide-y divide-white/10 border border-white/10 rounded-sm overflow-hidden">
              {STEPS.map(({ num, icon: Icon, title, desc, detail }, i) => (
                <div key={num}>
                  <button
                    className="w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-white/5 transition-colors group"
                    onClick={() => setOpenStep(openStep === i ? null : i)}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-sm bg-accent/10 flex items-center justify-center text-xs font-medium text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {num}
                    </div>
                    <Icon size={16} className="shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                    {openStep === i ? <ChevronUp size={16} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={16} className="shrink-0 text-muted-foreground" />}
                  </button>
                  {openStep === i && (
                    <div className="px-6 pb-5 pt-1 bg-black/20">
                      <ul className="flex flex-col gap-3 pl-14">
                        {detail.map((d, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                            <span className="shrink-0 w-1 h-1 rounded-full bg-accent mt-2" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ②-c 등록 팁 + 확인 사항 (2단 병렬) */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="text-xs font-medium tracking-widest uppercase text-accent mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Pro Tips & Requirements</div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
              노출 효과를 높이는 팁,<br />그리고 등록 전 확인 사항
            </h2>
          </Reveal>
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="flex flex-col gap-4">
              {TIPS.map(({ title, body }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="p-6 border border-white/10 rounded-sm hover:border-accent/50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle size={16} className="shrink-0 text-accent mt-0.5" />
                      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-7">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 content-start">
              {REQUIREMENTS.map(({ label, items }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-sm h-full">
                    <div className="text-xs font-medium text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>{label}</div>
                    <ul className="flex flex-col gap-2">
                      {items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle size={13} className="shrink-0 mt-0.5 text-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ③ 예약·웨이팅 통합관리 (좌우 교차 섹션) ─────────────── */}
      <section id="waiting" className="py-24 lg:py-32 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-20 text-center">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Reservation & Waiting</div>
            <h2 className="text-3xl lg:text-5xl font-extrabold leading-tight text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
              사전 예약부터 현장 웨이팅까지<br /><span className="text-accent">하나의 플랫폼</span>에서
            </h2>
          </Reveal>

          <div className="flex flex-col gap-24 lg:gap-32">
            {WAITING_FEATURES.map(({ icon: Icon, title, desc, points, cta }, i) => (
              <Reveal key={title}>
                <div className={`grid lg:grid-cols-2 gap-10 lg:gap-20 items-center ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
                  <div className="lg:[direction:ltr]">
                    <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-4" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>{title}</h3>
                    <p className="text-sm lg:text-base text-muted-foreground leading-relaxed mb-5">{desc}</p>
                    <ul className="flex flex-col gap-2.5 mb-6">
                      {points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle size={14} className="shrink-0 mt-0.5 text-accent" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => goManage(cta.path)} className="text-accent text-sm hover:brightness-125 inline-flex items-center gap-1">
                      {cta.label} <ArrowRight size={14} />
                    </button>
                  </div>
                  {/* 일러스트 자리 — 큰 아이콘 실루엣 */}
                  <div className="lg:[direction:ltr] flex items-center justify-center">
                    <div className="relative w-56 h-56 lg:w-72 lg:h-72 rounded-full bg-accent/5 border border-accent/15 flex items-center justify-center">
                      <Icon size={110} strokeWidth={1} className="text-accent/60" />
                      <div className="absolute -inset-4 rounded-full border border-white/5" style={{ animation: "popupFloat 7s ease-in-out infinite" }} />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ④ 운영 흐름 4단계 (원형 아이콘 그리드) ─────────────────── */}
      <section className="py-24 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-3" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>운영 흐름</h2>
            <p className="text-sm text-muted-foreground">오픈 전 설정부터 입장까지, 4단계면 충분합니다</p>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {FLOW.map(({ step, icon: Icon, title, desc }, i) => (
              <Reveal key={step} delay={i * 100} className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Icon size={28} className="text-foreground" strokeWidth={1.5} />
                </div>
                <div className="text-[11px] text-accent mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>{step}</div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ⑤ CTA — 그 외 기능 안내 + 가입 유도 ────────────────── */}
      <section className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <Reveal>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-3" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>실사용 화면이 궁금하다면...</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              방문자 통계 리포트, 긴급 공지 발송, 관리자 1:1 문의까지 —
              주최자 가입 즉시 모든 도구를 무료로 사용할 수 있습니다.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <button
              onClick={() => (user ? navigate("/seller") : navigate("/signup"))}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-medium px-8 py-4 rounded-sm hover:brightness-110 transition-all"
            >
              {user ? "주최자센터 열기" : "주최자 가입하기"}
              <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
