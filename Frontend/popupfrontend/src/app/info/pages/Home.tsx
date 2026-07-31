// 5174 랜딩 (7/30 리뉴얼)
// 상단바 메뉴는 InfoRoot 그대로 유지. 본문 구성:
//   ① 히어로 배너+하단 탭 스트립
//   ② 주최자용 서비스 소개 — "여기는 소비자 앱이 아니라 주최자 사이트"임을 알리는 구간
//   ③ 추천 팝업 ④ 신규 팝업 ⑤ 해시태그 필터+검색이 달린 전체 팝업 그리드
//   ⑥ 주최자 가입 CTA
// 카드·배너는 전부 실제 팝업 DB(공개 API)에서 오고, 클릭하면 소비자 서비스(5173)의
// 상세페이지로 넘어간다. 목업 섹션(성공사례 CASES·요금제 PLANS·통계 SERVICES)은 7/30에 제거.
import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router";
import {
    ArrowRight, Search, Store, CalendarClock, ChevronRight, CheckCircle,
    BarChart3, BellRing,
} from "lucide-react";
import {useAuth} from "../../context/AuthContext";
import {getPopups, getPopupImages, getKeywords, Popup, IdName} from "../../lib/api";
import { consumerPopupUrl } from "../../lib/siteUrls";

// ② 주최자용 서비스 요약 — 소비자 앱과의 차별점을 첫 스크롤에서 보여주는 구간.
// 구 랜딩의 CORE_FEATURES를 되살리고 /manage 앵커로 연결한다 (7/30 병합 반영).
const ORGANIZER_FEATURES = [
    {
        icon: Store,
        label: "Popup Contents",
        title: "팝업콘텐츠 등록",
        desc: "팝업 정보·이미지를 등록하면 관리자 심사를 거쳐 소비자 서비스에 바로 게시됩니다. 주소는 지도 좌표로 자동 변환되어 탐색 지도에 노출돼요.",
        points: ["팝업 정보·이미지 등록 폼", "심사/게시 상태 실시간 확인", "게시 즉시 소비자 앱 노출"],
        to: "/manage#register",
        cta: "팝업콘텐츠 등록 안내",
    },
    {
        icon: CalendarClock,
        label: "Reservation & Waiting",
        title: "예약·웨이팅 통합관리",
        desc: "사전예약·현장 예약·비회원 예약을 하나의 시스템으로 받고, 실시간 대기열 현황과 방문 데이터까지 한 화면에서 관리합니다.",
        points: ["사전·현장·비회원 예약 통합", "실시간 대기열 관제·호출", "슬롯 정원·방문 데이터 집계"],
        to: "/manage#waiting",
        cta: "예약·웨이팅 통합관리 안내",
    },
];

// 주최자만 쓰는 기능들 — 소비자 앱에는 없는 것들로 골라 차별점을 분명히 한다
const ORGANIZER_EXTRAS = [
    {icon: BarChart3, title: "방문자 통계", desc: "연령·성별·기간별 방문 추이와 예약 전환율"},
    {icon: BellRing, title: "긴급 공지 발송", desc: "운영 중 변경사항을 예약자에게 즉시 알림"},
    {icon: CheckCircle, title: "QR 입장 체크인", desc: "현장에서 QR 스캔으로 입장 확인·노쇼 처리"},
];

// 소비자 프론트(customerfrontend) — 카드 클릭 시 이 앱의 상세페이지로 보낸다
// 7/31 — 하드코딩된 localhost:5173을 lib/siteUrls.ts로 옮겼다.
// 배포 서버에서 히어로의 「지금 바로 확인하기」와 모든 팝업 카드가
// 사용자 자기 PC(localhost:5173)로 가고 있었다.
const detailUrl = consumerPopupUrl;

// 소비자 노출 가능한 상태만 (PENDING·REJECTED·SUSPENDED는 공개 화면에 내보내지 않는다)
const PUBLIC_STATUSES = new Set(["OPEN", "BEFOR", "CLOSED"]);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    OPEN: {label: "진행중", cls: "bg-accent text-accent-foreground"},
    BEFOR: {label: "오픈예정", cls: "bg-accent/20 text-accent border border-accent/40"},
    CLOSED: {label: "종료", cls: "bg-muted text-muted-foreground"},
};

const period = (p: Popup) =>
    p.startDate && p.endDate
        ? `${p.startDate.slice(5, 10).replace("-", ".")} ~ ${p.endDate.slice(5, 10).replace("-", ".")}`
        : "";

const categoryOf = (p: Popup) => p.keywordNames?.[0] ?? p.hashtags?.[0] ?? "";

export default function Home() {
    const navigate = useNavigate();
    const {user} = useAuth();

    const [popups, setPopups] = useState<Popup[]>([]);
    const [images, setImages] = useState<Record<number, string>>({}); // popupId → 대표 썸네일 URL
    const [keywords, setKeywords] = useState<IdName[]>([]);

    // 전체 팝업 그리드의 필터 상태 (해시태그 칩 + 팝업명 검색)
    const [chip, setChip] = useState("전체");
    const [query, setQuery] = useState("");

    // 히어로 배너에서 지금 보여주는 팝업 인덱스
    const [heroIdx, setHeroIdx] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getKeywords().then((k) => {
            if (!cancelled) setKeywords(k);
        }).catch(() => {
        });
        getPopups()
            .then(async (all) => {
                if (cancelled) return;
                const visible = all.filter((p) => PUBLIC_STATUSES.has(p.status));
                // 진행중 → 오픈예정 → 종료, 같은 상태 안에서는 최신 등록순
                const order: Record<string, number> = {OPEN: 0, BEFOR: 1, CLOSED: 2};
                visible.sort((a, b) =>
                    order[a.status] !== order[b.status]
                        ? order[a.status] - order[b.status]
                        : (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
                );
                setPopups(visible);

                // 대표 이미지 — 팝업별 개별 API라 부분 실패를 허용하며 병렬로 (목록 응답엔 이미지가 안 실려 온다)
                const targets = visible.slice(0, 24);
                const pairs = await Promise.all(
                    targets.map((p) =>
                        getPopupImages(p.id, "THUMBNAIL")
                            .then((imgs) => [p.id, imgs[0]?.imageUrl] as const)
                            .catch(() => [p.id, undefined] as const),
                    ),
                );
                if (cancelled) return;
                const map: Record<number, string> = {};
                for (const [id, url] of pairs) if (url) map[id] = url;
                setImages(map);
            })
            .catch(() => {
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // 히어로 = 이미지가 있는 진행중·오픈예정 팝업 최대 5개 (상단 배너 + 하단 탭)
    const heroes = useMemo(
        () => popups.filter((p) => p.status !== "CLOSED" && images[p.id]).slice(0, 5),
        [popups, images],
    );

    // 5초마다 자동 전환. 탭 클릭 시 해당 배너로 점프.
    useEffect(() => {
        if (heroes.length < 2) return;
        const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroes.length), 5000);
        return () => clearInterval(t);
    }, [heroes.length]);
    const hero = heroes[Math.min(heroIdx, Math.max(heroes.length - 1, 0))];

    // 추천 팝업 = 진행중 앞쪽 8개 (가로 스크롤 카드)
    const recommended = useMemo(() => popups.filter((p) => p.status === "OPEN").slice(0, 8), [popups]);

    // 신규 팝업 = 최근 등록 2개 (와이드 카드)
    const newest = useMemo(
        () => [...popups].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 2),
        [popups],
    );

    // 전체 팝업 그리드 — 칩(상태·카테고리) + 검색어 필터
    const chips = useMemo(() => {
        const cats = keywords.map((k) => k.name);
        return ["전체", "진행중", "오픈예정", "종료", ...cats];
    }, [keywords]);

    const filtered = useMemo(() => {
        return popups.filter((p) => {
            if (chip === "진행중" && p.status !== "OPEN") return false;
            if (chip === "오픈예정" && p.status !== "BEFOR") return false;
            if (chip === "종료" && p.status !== "CLOSED") return false;
            if (!["전체", "진행중", "오픈예정", "종료"].includes(chip)) {
                const tags = [...(p.keywordNames ?? []), ...(p.hashtags ?? [])];
                if (!tags.includes(chip)) return false;
            }
            if (query) {
                const q = query.toLowerCase();
                if (!p.title.toLowerCase().includes(q) && !p.companyName.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [popups, chip, query]);

    return (
        <main className="bg-background">
            {/* ── ① 히어로 배너 + 하단 탭 스트립 ───────────────────────────── */}
            {hero ? (
                <section className="bg-background">
                    <a href={detailUrl(hero.id)} target="_blank" rel="noopener noreferrer"
                       className="block relative group">
                        <div className="h-[340px] lg:h-[440px] overflow-hidden">
                            <img
                                src={images[hero.id]}
                                alt={hero.title}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-500"
                            />
                        </div>
                        {/* 좌측 텍스트 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent">
                            <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex flex-col justify-center gap-3">
                                <span className="text-xs tracking-widest text-white/70">{hero.companyName}</span>
                                <h1 className="text-3xl lg:text-5xl font-extrabold text-white max-w-xl leading-tight"
                                    style={{fontFamily: "'NanumSquareRound', sans-serif"}}>
                                    {hero.title}
                                </h1>
                                <p className="text-sm text-white/80">{period(hero)}{hero.location ? ` · ${hero.location}` : ""}</p>
                                <span
                                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent-foreground bg-accent/90 backdrop-blur px-4 py-2 rounded-sm w-fit group-hover:bg-accent transition-colors">
                  지금 바로 확인하기 <ChevronRight size={15}/>
                </span>
                            </div>
                        </div>
                    </a>

                    {/* 하단 탭 스트립 — 배너 후보 목록. 활성 탭만 밝게 */}
                    {heroes.length > 1 && (
                        <div className="grid" style={{gridTemplateColumns: `repeat(${heroes.length}, minmax(0, 1fr))`}}>
                            {heroes.map((p, i) => (
                                <button
                                    key={p.id}
                                    onClick={() => setHeroIdx(i)}
                                    className={`text-left px-5 py-4 border-r border-white/5 last:border-r-0 transition-colors ${
                                        i === heroIdx ? "bg-white/15" : "bg-white/[0.03] hover:bg-white/10"
                                    }`}
                                >
                                    <span className="block text-[11px] text-white/50 mb-1">{p.companyName}</span>
                                    <span
                                        className={`block text-sm truncate ${i === heroIdx ? "text-white font-semibold" : "text-white/70"}`}>
                    {p.title}
                  </span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                /* 팝업·이미지가 아직 없으면 기존 소개형 히어로로 폴백 — 랜딩이 비어 보이지 않게 */
                <section className="bg-card text-foreground">
                    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32">
                        <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight mb-4"
                            style={{fontFamily: "'NanumSquareRound', sans-serif"}}>
                            브랜드 팝업의 시작과 끝,<br/>팝온에서
                        </h1>
                        <p className="text-muted-foreground text-sm lg:text-base mb-8">
                            팝업 등록부터 예약·웨이팅 관제까지. 지금 진행 중인 팝업이 등록되면 이 자리에 소개됩니다.
                        </p>
                        <button onClick={() => (user ? navigate("/seller") : navigate("/signup"))}
                                className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm px-6 py-3 rounded-sm hover:bg-accent/90 transition-colors">
                            주최자로 시작하기 <ArrowRight size={15}/>
                        </button>
                    </div>
                </section>
            )}

            {/* ── ② 주최자용 서비스 소개 ─────────────────────────────────
          히어로와 팝업 카드 사이에 둔다. 이 자리가 없으면 소비자 앱과 구분이 안 돼
          "팝업 구경하는 사이트"로 읽힌다. 여기가 주최자를 위한 사이트라는 걸 먼저 알린다. */}
            <section className="border-y border-border bg-card">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
                    <div className="max-w-2xl mb-12">
                        <div
                            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-accent border border-accent/40 rounded-sm px-3 py-1.5 mb-5"
                            style={{fontFamily: "'DM Mono', monospace"}}>
                            FOR ORGANIZERS
                        </div>
                        <h2 className="text-2xl lg:text-4xl font-extrabold leading-tight mb-4"
                            style={{fontFamily: "'NanumSquareRound', sans-serif"}}>
                            팝온은 <span className="text-accent">브랜드</span>를 위한 플랫폼입니다
                        </h2>
                    </div>

                    {/* 핵심 기능 2종 — 구 랜딩의 요약 카드를 되살려 /manage 앵커로 연결 */}
                    <div className="grid md:grid-cols-2 gap-5 mb-10">
                        {ORGANIZER_FEATURES.map(({icon: Icon, label, title, desc, points, to, cta}) => (
                            <div key={title}
                                 className="border border-border rounded-md p-7 hover:border-accent/50 transition-colors flex flex-col">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center">
                                        <Icon size={18} className="text-accent"/>
                                    </div>
                                    <span className="text-[10px] tracking-widest text-muted-foreground"
                                          style={{fontFamily: "'DM Mono', monospace"}}>{label}</span>
                                </div>
                                <h3 className="text-lg font-extrabold mb-2"
                                    style={{fontFamily: "'NanumSquareRound', sans-serif"}}>{title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{desc}</p>
                                <ul className="flex flex-col gap-2 mb-6">
                                    {points.map((p) => (
                                        <li key={p} className="flex items-start gap-2 text-sm">
                                            <CheckCircle size={14} className="shrink-0 mt-0.5 text-accent"/>
                                            <span className="text-muted-foreground">{p}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate(to)}
                                        className="mt-auto text-sm text-accent hover:brightness-125 inline-flex items-center gap-1 self-start">
                                    {cta} <ArrowRight size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 소비자 앱에는 없는 기능들 — 차별점을 한 줄씩 */}
                    <div className="grid sm:grid-cols-3 gap-5 py-8 border-y border-border">
                        {ORGANIZER_EXTRAS.map(({icon: Icon, title, desc}) => (
                            <div key={title} className="flex gap-3">
                                <Icon size={17} className="shrink-0 mt-0.5 text-accent"/>
                                <div>
                                    <p className="text-sm font-bold mb-0.5">{title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 가입 CTA — 7/30에 페이지 맨 아래에서 이 자리로 옮겼다.
              팝업 카드를 스크롤하기 전에 "여기서 올릴 수도 있다"를 먼저 알린다. */}
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-5">
                        <div>
                            <h3 className="text-lg lg:text-xl font-extrabold mb-1"
                                style={{fontFamily: "'NanumSquareRound', sans-serif"}}>
                                내 브랜드 팝업도 여기에 올리고 싶다면
                            </h3>
                            <p className="text-sm text-muted-foreground">사업자 인증 후 바로 등록할 수 있습니다. 게시 전 관리자 심사를 거칩니다.</p>
                        </div>
                        <button
                            onClick={() => (user ? navigate("/seller") : navigate("/signup"))}
                            className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-bold px-6 py-3 rounded-sm hover:bg-accent/90 transition-colors shrink-0"
                        >
                            {user ? "주최자센터 가기" : "주최자로 시작하기"} <ArrowRight size={15}/>
                        </button>
                    </div>
                </div>
            </section>

            {/* ── ③ 추천 팝업 (해시태그 라벨 + 가로 카드 + 우측 바로가기) ── */}
            <section className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
                <h2 className="text-2xl font-extrabold mb-1" style={{fontFamily: "'NanumSquareRound', sans-serif"}}>추천
                    팝업</h2>
                <div className="flex items-start justify-between gap-8 mb-5">
                    <p className="text-sm font-bold text-accent">#지금 진행 중인</p>
                    {/* 우측 바로가기 — 핵심 기능 안내로 바로 진입 */}
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                        {/* 7/30 — 두 안내 페이지가 /manage로 병합됨. 앵커로 각 파트에 바로 진입 */}
                        <button onClick={() => navigate("/manage#register")}
                                className="flex items-center gap-1.5 hover:text-foreground"><Store size={14}/> 팝업콘텐츠 등록
                        </button>
                        <button onClick={() => navigate("/manage#waiting")}
                                className="flex items-center gap-1.5 hover:text-foreground"><CalendarClock
                            size={14}/> 예약·웨이팅 통합관리
                        </button>
                    </div>
                </div>

                {recommended.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                        {recommended.map((p) => (
                            <a
                                key={p.id}
                                href={detailUrl(p.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-none w-[170px] snap-start group"
                            >
                                <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-muted">
                                    {images[p.id] ? (
                                        <img src={images[p.id]} alt={p.title}
                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">이미지
                                            준비중</div>
                                    )}
                                    <span
                                        className="absolute bottom-2 left-2 text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">추천</span>
                                </div>
                                <p className="mt-2 text-sm font-medium truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{categoryOf(p) || p.companyName}</p>
                            </a>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground py-8">지금 진행 중인 팝업이 없습니다. 곧 새로운 팝업으로 찾아뵐게요.</p>
                )}
            </section>

            {/* ── ④ 신규 팝업 (NEW 배지 와이드 카드) ───────────────────────── */}
            {newest.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-14">
                    <h2 className="text-2xl font-extrabold mb-5"
                        style={{fontFamily: "'NanumSquareRound', sans-serif"}}>신규 팝업</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {newest.map((p) => (
                            <a
                                key={p.id}
                                href={detailUrl(p.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative flex h-[150px] rounded-md overflow-hidden bg-gradient-to-r from-accent to-accent/70 text-accent-foreground group"
                            >
                                <div className="flex-1 p-5 flex flex-col justify-between">
                                    <div>
                                        <span
                                            className="inline-block text-[10px] font-bold bg-background/25 backdrop-blur px-2 py-0.5 rounded-full mb-2">NEW</span>
                                        <p className="font-semibold truncate">{p.title}</p>
                                        <p className="text-xs text-accent-foreground/70 mt-0.5">{categoryOf(p) || p.companyName}</p>
                                    </div>
                                    <p className="text-xs text-accent-foreground/80">{period(p)} · 지금 바로 확인해 보세요!</p>
                                </div>
                                {images[p.id] && (
                                    <img src={images[p.id]} alt=""
                                         className="w-[45%] object-cover group-hover:scale-105 transition-transform duration-300"/>
                                )}
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ⑤ 전체 팝업 (칩 필터 + 검색 + 그리드) ─────────────────────── */}
            <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <h2 className="text-2xl font-extrabold" style={{fontFamily: "'NanumSquareRound', sans-serif"}}>
                        전체 팝업 <span className="text-base text-muted-foreground font-normal">{filtered.length}</span>
                    </h2>
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="팝업명 검색"
                            className="w-56 pl-3 pr-9 py-2 text-sm border-b border-border bg-transparent focus:outline-none focus:border-foreground"
                        />
                        <Search size={15} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    </div>
                </div>

                {/* 해시태그 칩 — 상태 4종 + 카테고리(keyword 마스터) */}
                <div className="bg-card rounded-md border border-border px-5 py-4 mb-6 flex flex-wrap gap-x-5 gap-y-2">
                    {chips.map((c) => (
                        <button
                            key={c}
                            onClick={() => setChip(c)}
                            className={`text-sm transition-colors ${
                                chip === c ? "bg-accent text-accent-foreground px-3 py-0.5 rounded-full" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            #{c}
                        </button>
                    ))}
                </div>

                {filtered.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtered.map((p) => {
                            const badge = STATUS_BADGE[p.status];
                            return (
                                <a
                                    key={p.id}
                                    href={detailUrl(p.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-card rounded-md overflow-hidden border border-border hover:shadow-lg transition-shadow group"
                                >
                                    <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                                        {images[p.id] ? (
                                            <img src={images[p.id]} alt={p.title}
                                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">이미지
                                                준비중</div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <p className="font-semibold text-sm truncate">{p.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{categoryOf(p) || p.companyName}</p>
                                        <div className="flex items-center justify-between mt-3">
                                            {badge && <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>}
                                            <span className="text-[11px] text-muted-foreground">{period(p)}</span>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground py-10 text-center">조건에 맞는 팝업이 없습니다.</p>
                )}
            </section>

            {/* 하단 CTA는 7/30에 ②(주최자 소개) 구간으로 올렸다 — 팝업 카드를 보기 '전에'
          이 사이트의 성격을 알리는 것이 목적이라, 맨 아래에 두면 늦다. */}
        </main>
    );
}
