import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, SlidersHorizontal, ChevronRight, Timer, Gift } from "lucide-react";
import { POPUPS, CATEGORIES, MY_RESERVATIONS, EVENTS } from "../data";
import { PopupCard, Stars } from "../components/PopupCard";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["전체", "예약 가능", "무료입장", "오늘 오픈", "인기순"];

export default function Home() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("전체");
  const navigate = useNavigate();
  const { user } = useAuth();

  const searched = q ? POPUPS.filter((p) => p.name.includes(q) || p.brand.includes(q)) : null;
  const nextReservation = MY_RESERVATIONS.find((r) => r.status === "확정");
  const recommend = user
    ? POPUPS.filter((p) => user.interests.includes(p.category)).concat(POPUPS.filter((p) => !user.interests.includes(p.category)))
    : POPUPS;
  const hotList = POPUPS.filter((p) => p.hot).concat(POPUPS.filter((p) => !p.hot)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* ── 검색창 ── */}
      <div className="px-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="팝업명·브랜드를 검색해 보세요"
            className="w-full pl-10 pr-11 py-3 text-sm bg-secondary rounded-full focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button onClick={() => navigate("/explore")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent">
            <SlidersHorizontal size={16} />
          </button>
        </div>
        {/* 필터 칩 */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── 검색 결과 ── */}
      {searched && (
        <section className="px-4 flex flex-col gap-2">
          <h2 className="text-sm font-semibold">"{q}" 검색 결과 {searched.length}건</h2>
          {searched.map((p) => <PopupCard key={p.id} popup={p} horizontal />)}
          {searched.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">일치하는 팝업이 없어요.</p>}
        </section>
      )}

      {!searched && (
        <>
          {/* ── 웨이팅/예약 안내 배너 ── */}
          {nextReservation && (
            <Link to="/reservations" className="mx-4 flex items-center gap-3 p-3.5 rounded-lg bg-accent/5 border border-accent/20">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Timer size={16} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-accent">다가오는 예약</div>
                <div className="text-[13px] font-medium truncate">{nextReservation.popupName}</div>
                <div className="text-[11px] text-muted-foreground">{nextReservation.date} {nextReservation.time} · {nextReservation.count}명</div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* ── 맞춤 추천 카드 ── */}
          <section>
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                {user ? `${user.nickname}님 취향 저격 팝업` : "지금 뜨는 팝업"}
              </h2>
              <Link to="/explore" className="text-xs text-muted-foreground flex items-center">더보기 <ChevronRight size={13} /></Link>
            </div>
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
              {recommend.slice(0, 5).map((p) => <PopupCard key={p.id} popup={p} />)}
            </div>
            {!user && (
              <p className="px-4 mt-2 text-[11px] text-muted-foreground">
                <Link to="/login" className="text-accent font-medium">로그인</Link>하면 관심사·연령 기반 맞춤 추천을 받을 수 있어요.
              </p>
            )}
          </section>

          {/* ── 카테고리 바로가기 ── */}
          <section className="px-4">
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <Link key={c} to="/explore" className="py-3 rounded-lg bg-secondary text-center text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors">
                  {c}
                </Link>
              ))}
            </div>
          </section>

          {/* ── 프로모션 카드 ── */}
          <section>
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>진행 중인 이벤트</h2>
              <Link to="/events" className="text-xs text-muted-foreground flex items-center">전체 <ChevronRight size={13} /></Link>
            </div>
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
              {EVENTS.filter((e) => e.state === "진행중").map((e) => (
                <Link key={e.id} to="/events" className="shrink-0 w-64 p-4 rounded-lg bg-foreground text-background">
                  <div className="flex items-center gap-1.5 text-[11px] text-background/60 mb-2"><Gift size={12} /> EVENT · {e.period}</div>
                  <div className="text-sm font-semibold leading-snug mb-1">{e.title}</div>
                  <div className="text-xs text-background/70 line-clamp-2">{e.desc}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── 인기 리스트 ── */}
          <section className="px-4 pb-6">
            <h2 className="text-base font-semibold mb-3" style={{ fontFamily: "'Noto Serif KR', serif" }}>실시간 인기 팝업</h2>
            <div className="flex flex-col gap-2">
              {hotList.map((p, i) => (
                <Link key={p.id} to={`/popup/${p.id}`} className="flex items-center gap-3 py-2">
                  <span className="w-6 text-center text-base font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.area} · {p.period}</div>
                  </div>
                  <Stars rating={p.rating} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
