import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, CheckCircle, Upload, Image, FileText, Tag, MapPin, Clock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  {
    num: "01",
    icon: FileText,
    title: "팝업 기본 정보 입력",
    desc: "팝업스토어의 이름, 브랜드, 카테고리, 운영 기간을 입력합니다.",
    detail: [
      "팝업 이름은 소비자가 검색·탐색 시 노출되는 핵심 텍스트입니다. 브랜드명 + 콘셉트 키워드 조합을 권장합니다.",
      "카테고리는 패션, 뷰티, 식음료, 라이프스타일, 아트, 테크 중 선택하며, 복수 선택이 가능합니다.",
      "운영 기간은 시작일과 종료일을 포함하며 최소 1일, 최대 90일까지 등록 가능합니다.",
    ],
  },
  {
    num: "02",
    icon: MapPin,
    title: "공간 및 위치 연결",
    desc: "팝업온 파트너 공간 중 운영할 장소를 선택하거나 직접 주소를 입력합니다.",
    detail: [
      "파트너 공간을 선택하면 층별 도면, 시설 정보, 반입 규정이 자동으로 연동됩니다.",
      "직접 주소 입력 시 주최자가 직접 계약한 공간에서 팝업온 플랫폼을 활용할 수 있습니다.",
      "지도 핀 위치는 소비자용 서비스 페이지에 그대로 노출되므로 정확히 입력해 주세요.",
    ],
  },
  {
    num: "03",
    icon: Image,
    title: "비주얼 콘텐츠 업로드",
    desc: "대표 이미지, 공간 사진, 제품 사진 등 팝업을 소개하는 이미지를 등록합니다.",
    // 7/29 — 실제 등록 폼·서버 리사이즈 규격과 일치하도록 정정 (PopupRegister THUMB_SPEC/DETAIL_SPEC 참고)
    detail: [
      "이미지는 JPG 형식, 장당 최대 10MB까지 업로드할 수 있습니다.",
      "썸네일은 800×800 정사각, 상세 이미지는 1080×1440 세로형으로 서버가 자동 변환합니다.",
      "썸네일·상세 이미지 모두 여러 장(각 최대 20장) 등록할 수 있고, 올린 순서대로 노출됩니다.",
    ],
  },
  {
    num: "04",
    icon: Tag,
    title: "상세 설명 및 해시태그",
    desc: "팝업의 콘셉트, 판매 상품, 특별 이벤트 등을 소개하는 상세 설명을 작성합니다.",
    detail: [
      "상세 설명은 최대 2,000자이며 마크다운 형식을 지원합니다 (굵게, 목록, 소제목 등).",
      "해시태그는 최대 10개까지 등록 가능하며 소비자 검색 결과 노출에 영향을 미칩니다.",
      "자주 검색되는 태그 예시: #성수동팝업 #한정판 #포토존 #굿즈 #무료입장",
    ],
  },
  {
    num: "05",
    icon: Clock,
    title: "운영 시간 및 입장 정보",
    desc: "매일 운영 시간, 입장료, 사전 예약 필요 여부 등 방문자 정보를 설정합니다.",
    detail: [
      "요일별로 다른 운영 시간을 설정할 수 있습니다 (예: 평일 11-20시, 주말 10-21시).",
      "사전 예약제 운영 시 팝업온의 예약 시스템과 연동하여 정원 관리가 가능합니다.",
      "입장료가 있는 경우 온라인 결제 연동을 별도 신청하시면 선매출도 가능합니다.",
    ],
  },
  {
    num: "06",
    icon: CheckCircle,
    title: "검토 요청 및 게시",
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

export default function ContentRegister() {
  const [openStep, setOpenStep] = useState<number | null>(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main>
      {/* ── PAGE HERO ────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-medium tracking-widest uppercase text-accent mb-5" style={{ fontFamily: "'DM Mono', monospace" }}>
              Content Registration Guide
            </div>
            <h1 className="text-3xl lg:text-5xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              팝업콘텐츠<br />등록 가이드
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mb-8">
              팝업온에 팝업스토어를 등록하는 전 과정을 단계별로 안내합니다. 6단계를 따라 진행하면 소비자에게 매력적으로 노출되는 팝업 페이지를 완성할 수 있습니다.
            </p>
            <button
              onClick={() => user ? navigate("/seller/popups/new") : navigate("/login")}
              className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-sm text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              {user ? "지금 등록 시작하기" : "로그인 후 등록하기"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="hidden lg:block relative rounded-sm overflow-hidden aspect-[4/3] bg-muted">
            <img
              src="https://images.unsplash.com/photo-1542744094-24638eff58bb?w=800&h=600&fit=crop&auto=format"
              alt="팝업 콘텐츠 등록 작업 장면"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP ─────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Step by Step</div>
            <h2 className="text-2xl lg:text-3xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>6단계 등록 절차</h2>
          </div>

          <div className="flex flex-col divide-y divide-border border border-border rounded-sm overflow-hidden">
            {STEPS.map(({ num, icon: Icon, title, desc, detail }, i) => (
              <div key={num}>
                <button
                  className="w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-secondary transition-colors group"
                  onClick={() => setOpenStep(openStep === i ? null : i)}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-sm bg-accent/10 flex items-center justify-center text-xs font-medium text-accent group-hover:bg-accent group-hover:text-white transition-colors"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {num}
                  </div>
                  <Icon size={16} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                  {openStep === i ? <ChevronUp size={16} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={16} className="shrink-0 text-muted-foreground" />}
                </button>
                {openStep === i && (
                  <div className="px-6 pb-5 pt-1 bg-secondary">
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
        </div>
      </section>

      {/* ── TIPS ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-foreground text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <div className="text-xs font-medium tracking-widest uppercase text-accent mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Pro Tips</div>
            <h2 className="text-2xl lg:text-3xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              노출 효과를 높이는<br />등록 팁
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TIPS.map(({ title, body }) => (
              <div key={title} className="p-6 border border-white/10 rounded-sm hover:border-accent/50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle size={16} className="shrink-0 text-accent mt-0.5" />
                  <h3 className="text-sm font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed pl-7">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REQUIREMENTS ─────────────────────────────────────── */}
      <section className="py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <div className="mb-10">
            <div className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Requirements</div>
            <h2 className="text-2xl lg:text-3xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>등록 전 확인 사항</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "필수 제출 서류", items: ["사업자등록증 사본", "팝업 기획서 (간단한 형식 가능)", "대표자 신분증"] },
              /* 7/29 — 실제 규격으로 정정: JPG만 받고, 서버가 썸네일 800×800·상세 1080×1440으로 변환한다 */
              { label: "이미지 규격", items: ["파일 형식: JPG (장당 최대 10MB)", "썸네일: 800×800 정사각으로 자동 변환", "상세 이미지: 1080×1440 세로형으로 자동 변환"] },
              { label: "등록 불가 콘텐츠", items: ["주류·담배 단독 판매", "의약품·의료기기 무허가 판매", "저작권 침해 상품 판매"] },
              { label: "운영 정책", items: ["최소 운영 기간 1일", "공간 반납 기준 시간 준수", "소비자 환불 정책 사전 명시"] },
            ].map(({ label, items }) => (
              <div key={label} className="p-5 bg-card border border-border rounded-sm">
                <div className="text-xs font-medium text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>{label}</div>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={13} className="shrink-0 mt-0.5 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-5">
              등록 요건을 충족했다면 지금 바로 시작하세요. 전담 매니저가 전 과정을 지원합니다.
            </p>
            <button
              onClick={() => user ? navigate("/seller/popups/new") : navigate("/login")}
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground px-8 py-4 rounded-sm text-sm font-medium hover:bg-accent transition-colors duration-200"
            >
              {user ? "팝업 등록 시작하기" : "로그인하고 등록하기"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
