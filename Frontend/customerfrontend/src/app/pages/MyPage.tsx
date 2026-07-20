import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronRight, MapPin, Heart, Tag, MessageSquare, TicketPercent,
  Bell, UserCog, FileText, LogOut, UserX, CalendarCheck, Pencil,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { VISIT_HISTORY, COUPONS, CATEGORIES, Popup } from "../data";
import {
  fetchPopups, toUiPopup, getWishlist, getMyReviews, deleteReview,
  saveInterests, CustomerReview,
} from "../lib/api";

type Sheet = "visits" | "likes" | "keywords" | "reviews" | "coupons" | "notif" | "account" | "terms" | null;

export default function MyPage() {
  const { user, logout, withdraw } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [keywords, setKeywords] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("interests") ?? "[]");
    } catch {
      return [];
    }
  });
  const [notif, setNotif] = useState({ tag: true, ad: false, schedule: true });
  const [likedPopups, setLikedPopups] = useState<Popup[]>([]);
  const [myReviews, setMyReviews] = useState<CustomerReview[]>([]);
  const [popupNames, setPopupNames] = useState<Record<number, string>>({});

  // 찜 목록·내 리뷰 실데이터 로드 (찜 ID → 팝업 정보 매핑)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([getWishlist(), getMyReviews(), fetchPopups()])
      .then(([wishIds, reviews, popups]) => {
        if (!alive) return;
        const byId = new Map(popups.map((p) => [p.id, p]));
        setLikedPopups(wishIds.map((id) => byId.get(id)).filter(Boolean).map((p) => toUiPopup(p!)));
        setMyReviews(reviews);
        setPopupNames(Object.fromEntries(popups.map((p) => [p.id, p.title])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  // 관심 키워드 토글 → 로컬 + 백엔드 저장
  const toggleKeyword = (c: string) => {
    const next = keywords.includes(c) ? keywords.filter((x) => x !== c) : [...keywords, c];
    setKeywords(next);
    localStorage.setItem("interests", JSON.stringify(next));
    saveInterests(next).catch(() => {});
  };

  const removeMyReview = async (id: number) => {
    if (!window.confirm("리뷰를 삭제할까요?")) return;
    try {
      await deleteReview(id);
      setMyReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했어요.");
    }
  };

  if (!user) {
    return (
      <div className="px-6 pt-16 flex flex-col items-center text-center">
        <p className="text-sm font-medium mb-1">로그인이 필요해요</p>
        <p className="text-xs text-muted-foreground mb-5">방문이력·찜·쿠폰을 한 곳에서 관리해 보세요.</p>
        <button onClick={() => navigate("/login")} className="text-sm px-8 py-3 rounded-lg bg-accent text-white font-medium">
          간편 로그인하기
        </button>
      </div>
    );
  }

  const MENUS: { icon: typeof MapPin; label: string; sub: string; key: Sheet }[] = [
    { icon: MapPin, label: "방문 이력", sub: `${VISIT_HISTORY.length}곳 방문`, key: "visits" },
    { icon: Heart, label: "찜 목록", sub: `팝업 ${likedPopups.length}개`, key: "likes" },
    { icon: Tag, label: "관심 키워드", sub: keywords.map((k) => `#${k}`).join(" "), key: "keywords" },
    { icon: MessageSquare, label: "내가 쓴 리뷰", sub: `${myReviews.length}개`, key: "reviews" },
    { icon: TicketPercent, label: "쿠폰함", sub: `사용 가능 ${COUPONS.filter((c) => !c.used).length}장`, key: "coupons" },
    { icon: Bell, label: "알림 설정", sub: "태그·광고·일정 알림", key: "notif" },
    { icon: UserCog, label: "계정 설정", sub: "닉네임·프로필 변경", key: "account" },
    { icon: FileText, label: "이용약관·개인정보 처리방침", sub: "동의 내역 조회", key: "terms" },
  ];

  return (
    <div className="flex flex-col pt-5 pb-8">
      {/* 프로필 */}
      <div className="px-4 flex items-center gap-3.5 mb-5">
        <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center text-lg font-bold">
          {user.nickname.slice(0, 1)}
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold flex items-center gap-2">
            {user.nickname}
            <button onClick={() => setSheet("account")} className="text-muted-foreground"><Pencil size={13} /></button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {user.provider === "kakao" ? "카카오 로그인 · 알림은 카카오톡으로" : "구글 로그인 · 알림은 이메일로"} 받는 중
          </div>
        </div>
      </div>

      {/* 예약 바로가기 */}
      <div className="px-4 mb-5">
        <Link to="/reservations" className="flex items-center gap-3 p-4 rounded-xl bg-foreground text-background">
          <CalendarCheck size={18} />
          <div className="flex-1">
            <div className="text-sm font-semibold">예약 관리</div>
            <div className="text-[11px] text-background/60">다가오는 예약 1건 · 대기중 1건</div>
          </div>
          <ChevronRight size={16} className="text-background/60" />
        </Link>
      </div>

      {/* 메뉴 */}
      <div className="flex flex-col">
        {MENUS.map(({ icon: Icon, label, sub, key }) => (
          <div key={label}>
            <button onClick={() => setSheet(sheet === key ? null : key)} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b border-border">
              <Icon size={17} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
              </div>
              <ChevronRight size={15} className={`text-muted-foreground transition-transform ${sheet === key ? "rotate-90" : ""}`} />
            </button>

            {/* 인라인 패널 */}
            {sheet === key && (
              <div className="px-4 py-4 bg-secondary/50 border-b border-border text-[13px]">
                {key === "visits" && (
                  <div className="flex flex-col gap-2.5">
                    {VISIT_HISTORY.map((v) => (
                      <div key={v.popupName} className="flex items-center gap-2">
                        <span className="flex-1 truncate">{v.popupName}</span>
                        <span className="text-[11px] text-muted-foreground">{v.date}</span>
                        {!v.reviewed && <button onClick={() => navigate("/popup/pu-002/review")} className="text-[11px] text-accent font-medium">후기 쓰기</button>}
                      </div>
                    ))}
                  </div>
                )}
                {key === "likes" && (
                  <div className="flex flex-col gap-2.5">
                    {likedPopups.length === 0 && <p className="text-[11px] text-muted-foreground">찜한 팝업이 없어요. 팝업 상세에서 하트를 눌러보세요.</p>}
                    {likedPopups.map((p) => (
                      <Link key={p.id} to={`/popup/${p.id}`} className="flex items-center gap-2.5">
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.period}</div>
                        </div>
                        <Heart size={13} className="fill-accent text-accent shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
                {key === "keywords" && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2.5">선택한 키워드의 팝업이 등록되면 알림을 보내드려요.</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c}
                          onClick={() => toggleKeyword(c)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            keywords.includes(c) ? "bg-accent text-white border-accent" : "border-border text-muted-foreground"
                          }`}>
                          #{c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {key === "reviews" && (
                  <div className="flex flex-col gap-2.5">
                    {myReviews.length === 0 && <p className="text-[11px] text-muted-foreground">작성한 리뷰가 없어요.</p>}
                    {myReviews.map((r) => (
                      <div key={r.id}>
                        <p className="leading-relaxed">"{r.content}"</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>{popupNames[r.popupId] ?? `팝업 #${r.popupId}`} · ★{r.rating} · {r.createdAt.slice(0, 10)}</span>
                          <button onClick={() => removeMyReview(r.id)} className="text-red-500">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {key === "coupons" && (
                  <div className="flex flex-col gap-2.5">
                    {COUPONS.map((c) => (
                      <div key={c.name} className={`flex items-center gap-3 p-3 rounded-lg border border-dashed ${c.used ? "opacity-45 border-border" : "border-accent/40 bg-accent/[0.03]"}`}>
                        <TicketPercent size={17} className="text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.from} · ~{c.until}</div>
                        </div>
                        <span className="text-[11px] shrink-0">{c.used ? "사용 완료" : "사용 가능"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {key === "notif" && (
                  <div className="flex flex-col gap-3">
                    {([
                      ["tag", "관심 태그 팝업 알림", "관심 키워드의 새 팝업 등록 소식"],
                      ["ad", "광고·프로모션 수신", "이벤트·혜택 정보 수신"],
                      ["schedule", "다가오는 일정 알림", "예약 하루 전·웨이팅 순서 임박 알림"],
                    ] as const).map(([k, label, desc]) => (
                      <label key={k} className="flex items-center gap-3 cursor-pointer">
                        <div className="flex-1">
                          <div className="font-medium">{label}</div>
                          <div className="text-[11px] text-muted-foreground">{desc}</div>
                        </div>
                        <input type="checkbox" checked={notif[k]} onChange={(e) => setNotif({ ...notif, [k]: e.target.checked })} className="accent-[#E85D3C] w-4 h-4" />
                      </label>
                    ))}
                  </div>
                )}
                {key === "account" && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">닉네임</label>
                      <input defaultValue={user.nickname} className="w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                    </div>
                    <button className="w-fit text-xs px-3.5 py-2 rounded-lg border border-border">프로필 사진 변경</button>
                    <button className="w-fit text-xs px-3.5 py-2 rounded-lg bg-foreground text-background">저장</button>
                  </div>
                )}
                {key === "terms" && (
                  <div className="flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between"><span>서비스 이용약관 동의</span><span className="text-[11px] text-muted-foreground">2026.03.02 동의</span></div>
                    <div className="flex justify-between"><span>개인정보 수집·이용 동의</span><span className="text-[11px] text-muted-foreground">2026.03.02 동의</span></div>
                    <div className="flex justify-between"><span>위치기반 서비스 동의</span><span className="text-[11px] text-muted-foreground">2026.03.02 동의</span></div>
                    <button className="w-fit text-[11px] text-accent mt-1">전문 보기</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 고객센터·로그아웃·탈퇴 */}
      <div className="px-4 mt-5 flex flex-col gap-2">
        <Link to="/support" className="text-center text-xs py-3 rounded-lg bg-secondary font-medium">문의하기 · FAQ</Link>
        <div className="flex justify-center gap-6 mt-2">
          <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <LogOut size={11} /> 로그아웃
          </button>
          <button onClick={() => { withdraw(); navigate("/"); }} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <UserX size={11} /> 회원 탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}
