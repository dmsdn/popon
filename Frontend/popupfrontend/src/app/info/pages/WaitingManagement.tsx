import { useNavigate } from "react-router";
import {
  ArrowRight, CalendarCheck, Users, Package, MonitorSmartphone,
  BellRing, QrCode, CheckCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// 예약·웨이팅 통합관리 소개 랜딩 (벤치마크: popga biz waiting)
// 실제 운영 도구는 주최자센터(/seller/reservations, /seller/waiting)에 있음 — 이 페이지는 기능 소개·유도

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "모든 예약 유형을 하나로",
    desc: "사전예약·현장 예약·비회원 예약까지 예약 방식이 달라도 하나의 명단으로 통합 관리됩니다. 채널별로 나뉜 엑셀 정리는 이제 그만.",
    points: ["시간대별 슬롯 정원 설정", "사전예약 + 현장 접수 통합 명단", "비회원도 이름·연락처만으로 등록"],
  },
  {
    icon: Users,
    title: "실시간 대기열 현황",
    desc: "현장 대기팀 수·순번을 실시간으로 관제하고, 호출·노쇼 처리를 버튼 하나로. 방문객은 원격 줄서기로 매장 밖에서 기다립니다.",
    points: ["원격 줄서기(웨이팅 등록)", "호출·노쇼 원클릭 처리", "순서 임박 자동 알림 발송"],
  },
  {
    icon: Package,
    title: "재고 데이터 관리",
    /* 7/29 정정 — 굿즈·재고 관리는 기능 탈락. 실제 제공하는 방문 통계 기능으로 교체 */
    desc: "슬롯 정원과 방문 데이터를 숫자로 관리합니다. 입장 인원과 방문 흐름이 기록으로 남아 다음 팝업 기획의 근거가 됩니다.",
    points: ["슬롯별 예약율·잔여석 집계", "방문자 연령·성별 분포 통계", "기간별 방문 추이·예약 전환율 리포트"],
  },
];

const FLOW = [
  { step: "01", icon: CalendarCheck, title: "슬롯 설정", desc: "날짜·시간대별 예약 정원을 등록" },
  { step: "02", icon: MonitorSmartphone, title: "예약 접수", desc: "소비자 앱 사전예약 + 현장·비회원 접수" },
  { step: "03", icon: BellRing, title: "실시간 관제", desc: "대기열 호출·노쇼 처리, 순번 알림" },
  { step: "04", icon: QrCode, title: "입장 체크인", desc: "QR 스캔으로 입장 확인, 데이터 자동 축적" },
];

export default function WaitingManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goManage = (path: string) => {
    if (user) navigate(path);
    else navigate("/login", { state: { from: path } });
  };

  return (
    <main>
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-24 lg:pt-28 lg:pb-28 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-accent mb-8 border border-accent/30 rounded-sm px-3 py-1.5"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Reservation & Waiting
          </div>
          <h1
            className="text-4xl lg:text-6xl font-semibold leading-tight tracking-tight mb-6"
            style={{ fontFamily: "'Noto Serif KR', serif", lineHeight: "1.2" }}
          >
            사전 예약부터 현장 웨이팅까지<br />
            <span className="text-accent">하나의 플랫폼</span>에서.
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            사전예약·현장 예약·비회원 예약을 모두 지원하는 통합 예약 시스템과
            실시간 대기열 관제, 재고 데이터 관리까지 — 팝업 운영의 현장을 팝업온이 정리해 드립니다.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => goManage("/seller/reservations")}
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground px-6 py-3 rounded-sm text-sm font-medium hover:bg-accent transition-colors duration-200"
            >
              예약 슬롯·명단 관리하기
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => goManage("/seller/waiting")}
              className="inline-flex items-center gap-2 border border-foreground/30 px-6 py-3 rounded-sm text-sm font-medium hover:border-foreground transition-colors duration-200"
            >
              대기열·인원 관제 →
            </button>
          </div>
          <div className="mt-12 flex gap-10 justify-center">
            {[
              { value: "3가지", label: "예약 유형 통합" },
              { value: "실시간", label: "대기열 관제" },
              { value: "자동", label: "재고·데이터 집계" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 핵심 기능 3가지 ─────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Integrated Operations</div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              예약·웨이팅·재고,<br />세 가지를 한 화면에서
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {FEATURES.map(({ icon: Icon, title, desc, points }) => (
              <div key={title} className="bg-card p-8 group hover:bg-secondary transition-colors duration-200">
                <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors mb-6">
                  <Icon size={18} className="text-accent" />
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{desc}</p>
                <ul className="flex flex-col gap-2">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={14} className="shrink-0 mt-0.5 text-accent" />
                      <span className="text-muted-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 운영 흐름 4단계 ─────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16 text-center">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>How It Works</div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              오픈 전 설정부터 입장까지<br />4단계면 충분합니다
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FLOW.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <span className="text-xl font-bold text-border" style={{ fontFamily: "'DM Mono', monospace" }}>{step}</span>
                </div>
                <h3 className="text-base font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-20 bg-foreground text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold mb-4" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            줄 세우는 일은 팝업온에게,<br />브랜드는 방문객 경험에만 집중하세요
          </h2>
          <p className="text-white/60 text-sm mb-8">주최자 가입 즉시 예약·웨이팅 관리 도구를 무료로 사용할 수 있습니다</p>
          <button
            onClick={() => goManage("/seller/reservations")}
            className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-sm text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
          >
            {user ? "예약·웨이팅 관리 시작하기" : "주최자 로그인하고 시작하기"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  );
}
