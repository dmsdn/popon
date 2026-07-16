import { useEffect, useState } from "react";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { CATEGORIES, Popup } from "../data";
import { PopupCard } from "../components/PopupCard";
import { useAuth } from "../context/AuthContext";
import { fetchPopups, toUiPopup } from "../lib/api";

const AREAS = ["전체", "성수", "홍대", "여의도", "잠실", "한남"];
const THEMES = ["운영중", "사전예약", "실시간 예약", "후기 많은 순", "혜택", "웨이팅 짧은 순"];

export default function Explore() {
  const [area, setArea] = useState("전체");
  const [cat, setCat] = useState("전체");
  const [q, setQ] = useState("");
  const { user } = useAuth();

  const [popups, setPopups] = useState<Popup[]>([]);
  useEffect(() => {
    fetchPopups().then((list) => setPopups(list.map(toUiPopup))).catch(() => setPopups([]));
  }, []);

  const results = popups.filter(
    (p) =>
      (area === "전체" || p.area === area) &&
      (cat === "전체" || p.category === cat) &&
      (q === "" || p.name.includes(q) || p.brand.includes(q)),
  );

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* 검색 */}
      <div className="px-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="브랜드명·팝업명 검색"
            className="w-full pl-10 pr-4 py-3 text-sm bg-secondary rounded-full focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* 지도 (연동 전 플레이스홀더) */}
      <div className="mx-4 relative h-44 rounded-lg bg-[#e8ecef] overflow-hidden">
        <div className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "linear-gradient(#d3dade 1px, transparent 1px), linear-gradient(90deg, #d3dade 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {[{ top: "30%", left: "22%" }, { top: "55%", left: "48%" }, { top: "25%", left: "68%" }, { top: "65%", left: "78%" }].map((pos, i) => (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={pos}>
            <MapPin size={22} className="text-accent fill-accent/20" />
          </div>
        ))}
        <button className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-background shadow border border-border">
          <LocateFixed size={12} className="text-accent" /> 내 위치 기준
        </button>
        <span className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full bg-background/90 border border-border text-muted-foreground">
          지도 API 연동 예정 · 반경 3km 내 {results.length}개
        </span>
      </div>

      {/* 필터 */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {AREAS.map((a) => (
            <button key={a} onClick={() => setArea(a)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${area === a ? "bg-accent text-white border-accent" : "border-border text-muted-foreground"}`}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {["전체", ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${cat === c ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {THEMES.map((t) => (
            <button key={t} className="shrink-0 text-[11px] px-3 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground">
              #{t}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 리스트 */}
      <section className="px-4 pb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{results.length}개의 팝업</h2>
          {user && <span className="text-[11px] text-muted-foreground">관심사 기반 정렬</span>}
        </div>
        {results
          .slice()
          .sort((a, b) => (user ? Number(user.interests.includes(b.category)) - Number(user.interests.includes(a.category)) : 0))
          .map((p) => <PopupCard key={p.id} popup={p} horizontal />)}
        {results.length === 0 && <p className="text-xs text-muted-foreground py-8 text-center">조건에 맞는 팝업이 없어요. 필터를 조정해 보세요.</p>}
      </section>
    </div>
  );
}
