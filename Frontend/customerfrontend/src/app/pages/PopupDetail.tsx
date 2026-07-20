import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  Heart, Share2, MapPin, CalendarDays, Clock, AlertCircle, Ticket,
  Users, ChevronRight, ThumbsUp, BadgeCheck, ExternalLink, Camera,
} from "lucide-react";
import { Popup, REVIEWS, BLOG_REVIEWS, CONGESTION_COLOR, RESERVATION_HINT } from "../data";
import { Stars } from "../components/PopupCard";
import { fetchPopup, toUiPopup, getWishlist, addWishlist, removeWishlist } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function PopupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPopup(id)
      .then((p) => setPopup(toUiPopup(p)))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "팝업을 불러오지 못했어요."));
    // 로그인 상태면 찜 여부 로드 (customerbackend)
    if (user) {
      getWishlist()
        .then((ids) => setLiked(ids.includes(Number(id))))
        .catch(() => {});
    }
  }, [id, user]);

  const toggleLike = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const next = !liked;
    setLiked(next); // 낙관적 갱신
    try {
      if (next) await addWishlist(Number(id));
      else await removeWishlist(Number(id));
    } catch {
      setLiked(!next); // 실패 시 롤백
    }
  };

  if (loadError) {
    return (
      <div className="px-6 pt-20 text-center">
        <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Link to="/" className="inline-block mt-5 text-sm px-6 py-3 rounded-lg bg-accent text-white font-medium">홈으로</Link>
      </div>
    );
  }
  if (!popup) {
    return <div className="px-6 pt-20 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  }
  const reviews = REVIEWS.filter((r) => r.popupId === popup.id);

  return (
    <div className="flex flex-col">
      {/* 대표 이미지 */}
      <div className="relative aspect-[4/3] bg-muted">
        <img src={popup.image} alt={popup.name} className="w-full h-full object-cover" />
        <span className={`absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full border bg-background/90 ${CONGESTION_COLOR[popup.congestion]}`}>
          현재 {popup.congestion} · 대기 {popup.waitingTeams}팀
        </span>
      </div>

      {/* 기본 정보 */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/brand/${popup.brandId}`} className="text-xs text-accent font-medium flex items-center gap-0.5">
              {popup.brand} <ChevronRight size={12} />
            </Link>
            <h1 className="text-lg font-semibold leading-snug mt-0.5" style={{ fontFamily: "'Noto Serif KR', serif" }}>{popup.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Stars rating={popup.rating} size={13} />
              <span className="text-xs text-muted-foreground">리뷰 {popup.reviewCount}개</span>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={toggleLike}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${liked ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground"}`}>
              <Heart size={16} className={liked ? "fill-accent" : ""} />
            </button>
            <button onClick={() => { setShared(true); setTimeout(() => setShared(false), 1500); }}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground">
              <Share2 size={16} />
            </button>
          </div>
        </div>
        {shared && <div className="mt-2 text-[11px] text-accent">링크가 복사되었어요! 카카오톡·인스타그램으로 공유해 보세요.</div>}
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">{popup.intro}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {popup.tags.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">#{t}</span>)}
        </div>
      </div>

      {/* 운영 정보 */}
      <div className="px-4 py-4 border-b border-border flex flex-col gap-2.5 text-[13px]">
        <div className="flex items-center gap-2.5"><CalendarDays size={15} className="text-muted-foreground shrink-0" /> {popup.period}</div>
        <div className="flex items-center gap-2.5"><Clock size={15} className="text-muted-foreground shrink-0" /> {popup.hours}</div>
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-muted-foreground shrink-0" /> {popup.location}
          <button className="ml-auto text-[11px] text-accent">지도 보기</button>
        </div>
        <div className="flex items-center gap-2.5"><Ticket size={15} className="text-muted-foreground shrink-0" /> {popup.entry}</div>
      </div>

      {/* 시간대별 혼잡도 + 예약 가능 */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-semibold mb-3">시간대별 혼잡도 · 예약 가능</h2>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {RESERVATION_HINT.map((s) => (
            <div key={s.time} className={`shrink-0 w-16 rounded-md border p-2 text-center ${s.available ? "border-border" : "border-border opacity-45"}`}>
              <div className="text-[11px] font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>{s.time}</div>
              <div className={`mt-1 text-[10px] px-1 py-0.5 rounded-full border ${CONGESTION_COLOR[s.level]}`}>{s.level}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.available ? "예약 가능" : "마감"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 유의사항 */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-semibold mb-2.5">유의사항</h2>
        <ul className="flex flex-col gap-1.5">
          {popup.notice.map((n) => (
            <li key={n} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-500" /> {n}
            </li>
          ))}
          {popup.notice.length === 0 && (
            <li className="text-xs text-muted-foreground">등록된 유의사항이 없어요.</li>
          )}
        </ul>
      </div>

      {/* 서비스 내 후기 */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">방문 후기 {reviews.length > 0 && `(${reviews.length})`}</h2>
          <button onClick={() => navigate(`/popup/${popup.id}/review`)} className="flex items-center gap-1 text-xs text-accent font-medium">
            <Camera size={13} /> 후기 작성하기
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-secondary/60">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-semibold">{r.author}</span>
                {r.verified && <BadgeCheck size={12} className="text-accent" />}
                <Stars rating={r.rating} size={11} />
                <span className="ml-auto text-[10px] text-muted-foreground">{r.date}</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/85">{r.content}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp size={11} /> 공감 {r.likes}</span>
                {r.photos > 0 && <span className="flex items-center gap-1"><Camera size={11} /> 사진 {r.photos}</span>}
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">아직 후기가 없어요. 첫 후기를 남겨보세요!</p>}
        </div>
      </div>

      {/* 블로그 후기 */}
      <div className="px-4 py-4 pb-8">
        <h2 className="text-sm font-semibold mb-3">블로그 후기</h2>
        <div className="flex flex-col gap-2">
          {BLOG_REVIEWS.map((b) => (
            <a key={b.title} href="#" className="flex items-center gap-2 py-1.5 group">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate group-hover:text-accent">{b.title}</div>
                <div className="text-[11px] text-muted-foreground">{b.blog} · {b.date}</div>
              </div>
              <ExternalLink size={13} className="text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border flex gap-2 z-30">
        <button onClick={() => navigate("/waiting")} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-3 rounded-lg border border-foreground font-medium">
          <Users size={15} /> 원격 줄서기
        </button>
        <button onClick={() => navigate(`/popup/${popup.id}/reserve`)} className="flex-1 text-sm py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90">
          방문 예약하기
        </button>
      </div>
      <div className="h-16" />
    </div>
  );
}
