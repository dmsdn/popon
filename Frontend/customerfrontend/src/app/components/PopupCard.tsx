import { Link } from "react-router";
import { Star, MapPin } from "lucide-react";
import { Popup, CONGESTION_COLOR } from "../data";

export function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <span className="font-semibold">{rating > 0 ? rating.toFixed(1) : "신규"}</span>
    </span>
  );
}

export function PopupCard({ popup, horizontal = false }: { popup: Popup; horizontal?: boolean }) {
  if (horizontal) {
    return (
      <Link to={`/popup/${popup.id}`} className="flex gap-3 p-3 bg-background border border-border rounded-lg hover:border-accent/40 transition-colors">
        <img src={popup.image} alt={popup.name} className="w-20 h-20 rounded-md object-cover shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-[11px] text-accent font-medium">{popup.category}</div>
          <div className="text-sm font-semibold truncate">{popup.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin size={10} /> {popup.location}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={popup.rating} />
            <span className="text-[11px] text-muted-foreground">리뷰 {popup.reviewCount}</span>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link to={`/popup/${popup.id}`} className="block w-44 shrink-0">
      <div className="relative rounded-lg overflow-hidden aspect-[4/5] bg-muted mb-2">
        <img src={popup.image} alt={popup.name} className="w-full h-full object-cover" />
        <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full border bg-background/90 ${CONGESTION_COLOR[popup.congestion]}`}>
          {popup.congestion}
        </span>
        {popup.entry === "사전예약제" && (
          <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-foreground/80 text-background">예약제</span>
        )}
      </div>
      <div className="text-[11px] text-accent font-medium">{popup.category} · {popup.area}</div>
      <div className="text-sm font-semibold leading-snug line-clamp-2">{popup.name}</div>
      <div className="flex items-center gap-2 mt-1">
        <Stars rating={popup.rating} />
        <span className="text-[11px] text-muted-foreground">{popup.period}</span>
      </div>
    </Link>
  );
}
