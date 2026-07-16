import { useState } from "react";
import { useParams, Link } from "react-router";
import { Heart, Instagram, Store, ChevronRight } from "lucide-react";
import { BRANDS, POPUPS } from "../data";

export default function Brand() {
  const { id } = useParams();
  const brand = BRANDS[id ?? "br-001"] ?? BRANDS["br-001"];
  const [liked, setLiked] = useState(false);
  const currentPopup = POPUPS.find((p) => p.brand === brand.name);

  return (
    <div className="flex flex-col pt-4 pb-8">
      {/* 브랜드 정보 */}
      <div className="px-4 pb-5 border-b border-border">
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
            <Store size={22} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>{brand.name}</h1>
            <a href="#" className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Instagram size={12} /> {brand.sns}
            </a>
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className={`shrink-0 flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border font-medium transition-colors ${
              liked ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground"
            }`}
          >
            <Heart size={13} className={liked ? "fill-accent" : ""} /> {liked ? "찜 완료" : "브랜드 찜"}
          </button>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{brand.desc}</p>
        {liked && (
          <p className="mt-2 text-[11px] text-accent">이 브랜드의 새 팝업 오픈·이벤트 소식을 알림으로 보내드릴게요.</p>
        )}
      </div>

      {/* 진행 중 팝업 */}
      {currentPopup && (
        <div className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-semibold mb-3">지금 진행 중</h2>
          <Link to={`/popup/${currentPopup.id}`} className="flex gap-3 p-3 rounded-lg border border-accent/30 bg-accent/[0.03]">
            <img src={currentPopup.image} alt={currentPopup.name} className="w-16 h-16 rounded-md object-cover" />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="text-[13px] font-semibold truncate">{currentPopup.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{currentPopup.period} · {currentPopup.location}</div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground self-center" />
          </Link>
        </div>
      )}

      {/* 이전 팝업 기록 */}
      <div className="px-4 py-5">
        <h2 className="text-sm font-semibold mb-3">브랜드 팝업 히스토리</h2>
        <div className="flex flex-col">
          {brand.history.map((h, i) => (
            <div key={h.name} className="flex gap-3.5 relative">
              <div className="flex flex-col items-center">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-accent" : "bg-border"}`} />
                {i < brand.history.length - 1 && <span className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-5 min-w-0">
                <div className="text-[13px] font-medium">{h.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{h.period} · 누적 방문 {h.visitors}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
