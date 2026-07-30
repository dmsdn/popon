// 관리자 공지 (7/30 신설) — 관리자가 주최자에게 보낸 공지를 확인하는 화면.
// 백엔드: NoticeBusinessController
//   GET   /api/business/notices/my[?category=]   내가 받은 공지 목록
//   GET   /api/business/notices/my/unread-count  안 읽은 개수
//   PATCH /api/business/notices/my/{id}/read     읽음 처리
//
// 상단바 벨 패널(SellerRoot)도 같은 원천을 쓰지만 최근 몇 건만 보여준다.
// 이 페이지는 전체 이력 + 분류 필터 + 본문 펼침을 담당한다.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Loader2, Megaphone, ChevronDown, ChevronUp, MailOpen, Mail, CheckCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyNoticeInbox, markNoticeRead, NoticeInboxItem, NoticeCategoryCode,
} from "../../lib/api";

// NoticeCategory enum(백엔드) ↔ 화면 표기.
// 관리자가 직접 보낸 공지는 NOTICE, 나머지는 시스템이 자동 발송한 알림이다.
const CATEGORY_LABEL: Record<string, string> = {
  NOTICE: "관리자 공지",
  WISHLIST: "찜 알림",
  RESERVATION: "예약 알림",
  WAITING: "웨이팅 알림",
};
const CATEGORY_STYLE: Record<string, string> = {
  NOTICE: "bg-accent/15 text-accent border-accent/40",
  WISHLIST: "bg-secondary text-muted-foreground border-border",
  RESERVATION: "bg-secondary text-muted-foreground border-border",
  WAITING: "bg-secondary text-muted-foreground border-border",
};

// 필터 탭 — "전체"는 서버 파라미터 없이 전부, 나머지는 category로 서버에서 걸러 받는다
const TABS: { key: "ALL" | NoticeCategoryCode; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "NOTICE", label: "관리자 공지" },
  { key: "RESERVATION", label: "예약" },
  { key: "WAITING", label: "웨이팅" },
  { key: "WISHLIST", label: "찜" },
];

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function AdminNoticeInbox() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [list, setList] = useState<NoticeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"ALL" | NoticeCategoryCode>("ALL");
  const [openId, setOpenId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // 목록 로드 — 탭이 바뀌면 서버에서 다시 받는다(분류 필터가 서버에 있음).
  // cancelled 플래그로 탭을 빠르게 바꿔도 옛 응답이 새 응답을 덮지 않게 막는다.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getMyNoticeInbox(tab === "ALL" ? undefined : tab)
      .then((rows) => {
        if (cancelled) return;
        // 최신순 — 서버 정렬을 신뢰하지 않고 화면에서 한 번 더 맞춘다
        setList([...rows].sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? "")));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const unread = useMemo(() => list.filter((n) => !n.read), [list]);

  // 펼치면 읽음 처리 — 서버 반영과 화면 갱신을 같이 한다.
  // 실패해도 펼침 자체는 막지 않는다(읽는 것과 읽음 기록은 별개).
  const toggle = (n: NoticeInboxItem) => {
    const opening = openId !== n.recipientId;
    setOpenId(opening ? n.recipientId : null);
    if (opening && !n.read) {
      setList((prev) =>
        prev.map((x) => (x.recipientId === n.recipientId ? { ...x, read: true } : x)),
      );
      markNoticeRead(n.recipientId).catch(() => {
        // 서버 반영 실패 → 화면 상태를 되돌려 "읽음"이 거짓으로 남지 않게 한다
        setList((prev) =>
          prev.map((x) => (x.recipientId === n.recipientId ? { ...x, read: false } : x)),
        );
      });
    }
  };

  // 모두 읽음 — 개별 PATCH를 병렬로. 일부 실패는 허용하고 성공분만 반영한다.
  const markAll = async () => {
    if (unread.length === 0) return;
    setMarkingAll(true);
    const results = await Promise.all(
      unread.map((n) =>
        markNoticeRead(n.recipientId)
          .then(() => n.recipientId)
          .catch(() => null),
      ),
    );
    const done = new Set(results.filter((v): v is number => v !== null));
    setList((prev) => prev.map((x) => (done.has(x.recipientId) ? { ...x, read: true } : x)));
    setMarkingAll(false);
  };

  if (!isBusiness) {
    return (
      <div className="text-sm text-muted-foreground">
        주최자 계정으로 로그인해야 관리자 공지를 확인할 수 있습니다.{" "}
        <Link to="/login" state={{ from: "/seller/admin-notices" }} className="underline underline-offset-2">
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">관리자 공지</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            플랫폼 관리자가 보낸 공지와 예약·웨이팅 시스템 알림을 모아 봅니다.
            {unread.length > 0 && (
              <> · <span className="text-accent font-semibold">안 읽음 {unread.length}건</span></>
            )}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAll}
            disabled={markingAll}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            모두 읽음
          </button>
        )}
      </div>

      {/* ── 분류 탭 ── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
              tab === key
                ? "bg-foreground text-primary-foreground border-foreground"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-sm bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── 목록 ── */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 size={14} className="animate-spin" /> 불러오는 중…
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-border rounded-sm py-16 text-center">
          <Megaphone size={22} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {tab === "ALL" ? "받은 공지가 없습니다." : "이 분류의 공지가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm divide-y divide-border">
          {list.map((n) => {
            const open = openId === n.recipientId;
            return (
              <div key={n.recipientId}>
                <button
                  onClick={() => toggle(n)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-secondary/60 transition-colors"
                >
                  {/* 읽음 여부 — 아이콘과 제목 굵기 두 가지로 표시 */}
                  {n.read ? (
                    <MailOpen size={15} className="shrink-0 mt-0.5 text-muted-foreground" />
                  ) : (
                    <Mail size={15} className="shrink-0 mt-0.5 text-accent" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          CATEGORY_STYLE[n.category] ?? "bg-secondary text-muted-foreground border-border"
                        }`}
                      >
                        {CATEGORY_LABEL[n.category] ?? n.category}
                      </span>
                      {/* 팝업별 공지면 어느 팝업인지 — 전체 공지는 popupId가 null이다 */}
                      {n.popupTitle && (
                        <span className="text-[11px] text-muted-foreground truncate">「{n.popupTitle}」</span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${n.read ? "text-foreground" : "font-semibold text-foreground"}`}>
                      {n.title}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{fmt(n.sentAt)}</span>
                    {open ? (
                      <ChevronUp size={15} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={15} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {open && (
                  <div className="px-5 pb-5 pl-[3.25rem] bg-secondary/40">
                    {/* whitespace-pre-wrap — 관리자가 넣은 줄바꿈을 그대로 살린다 */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{n.content}</p>
                    {n.popupId && (
                      <Link
                        to={`/seller/popups/${n.popupId}`}
                        className="inline-block mt-4 text-xs text-accent hover:brightness-125"
                      >
                        해당 팝업 상세로 이동 →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
