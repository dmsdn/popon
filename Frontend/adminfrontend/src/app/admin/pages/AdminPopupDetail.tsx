import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Loader2, MapPin, CalendarClock, Users, Ticket, Pencil,
  CheckCircle2, XCircle, PauseCircle, ShieldCheck, Building2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getPopup, approvePopup, rejectPopup, Popup, PopupStatusCode, ApiError } from "../../lib/api";
import { SUSPEND_MARKER, isSuspended } from "../../lib/adminPopupMeta";

// 관리자 팝업 상세페이지 — 7/24 회의: 팝업 관리 목록에서 팝업명 클릭 시 진입,
// 이 상세에서 심사(승인/반려)·게시중지·수정이 모두 동작한다.

const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
};
const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
};

const QUEUE_MODE_LABEL: Record<string, string> = {
  PRERESERVATION_ONLY: "사전예약만",
  ONSITE_WAITING_ONLY: "현장 웨이팅만",
  BOTH: "사전예약 + 현장 웨이팅",
};

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");
const fmtTime = (iso: string | null) => (iso ? iso.slice(11, 16) : "");

export default function AdminPopupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [popup, setPopup] = useState<Popup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getPopup(id)
      .then((p) => alive && setPopup(p))
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "팝업을 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, [id]);

  const handleAuthError = (e: unknown, fallback: string) => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.");
      logout();
    } else {
      alert(e instanceof Error ? e.message : fallback);
    }
  };

  // 심사: 승인 / 반려 — 목록 화면과 동일 API, 응답으로 화면 즉시 갱신
  const decide = async (action: "approve" | "reject") => {
    if (!popup) return;
    if (action === "reject" && !reason.trim()) {
      alert("반려 사유를 입력해 주세요. (주최자에게 전달됩니다)");
      return;
    }
    setActing(true);
    try {
      const updated = action === "approve" ? await approvePopup(popup.id) : await rejectPopup(popup.id, reason.trim());
      setPopup(updated);
      setReason("");
    } catch (e) {
      handleAuthError(e, "처리에 실패했습니다.");
    } finally {
      setActing(false);
    }
  };

  // 게시중지 ↔ 재개 (목록 화면과 동일: 반려 API + [게시중지] 마커 재사용)
  const toggleSuspend = async () => {
    if (!popup) return;
    const suspended = isSuspended(popup.status, popup.rejectReason);
    if (!window.confirm(suspended ? `「${popup.title}」 게시를 재개할까요?` : `「${popup.title}」 게시를 중지할까요? 소비자 화면에서 즉시 숨겨집니다.`)) return;
    setActing(true);
    try {
      const updated = suspended
        ? await approvePopup(popup.id)
        : await rejectPopup(popup.id, `${SUSPEND_MARKER} 관리자에 의해 게시가 중지되었습니다.`);
      setPopup(updated);
    } catch (e) {
      handleAuthError(e, "처리에 실패했습니다.");
    } finally {
      setActing(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{loadError}</div>
        <Link to="/admin/popups" className="text-xs text-accent underline underline-offset-2">팝업 관리로 돌아가기</Link>
      </div>
    );
  }
  if (!popup) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
      </div>
    );
  }

  const suspended = isSuspended(popup.status, popup.rejectReason);
  const reviewable = !suspended && (popup.status === "PENDING" || popup.status === "REJECTED");
  const suspendable = suspended || popup.status === "BEFOR" || popup.status === "OPEN";

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* 헤더 + 액션 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/popups")} className="text-muted-foreground hover:text-foreground" title="목록으로">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{popup.title}</h1>
            {suspended ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-white border-slate-800">게시중지</span>
            ) : (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[popup.status]}`}>{STATUS_LABEL[popup.status]}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            PU-{String(popup.id).padStart(4, "0")} · {popup.companyName} · 등록일 {fmtDate(popup.createdAt)}
            {popup.statusChangedAt && ` · 상태 확정 ${fmtDate(popup.statusChangedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSuspend}
            disabled={acting || !suspendable}
            title={suspended ? "누르면 게시를 재개합니다" : "게시 상태의 팝업을 소비자 화면에서 숨깁니다"}
            className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm border transition-colors disabled:opacity-40 ${
              suspended ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-700" : "border-border hover:border-red-400 hover:text-red-500"
            }`}
          >
            <PauseCircle size={13} /> {suspended ? "게시 재개" : "게시중지"}
          </button>
          <button
            onClick={() => navigate(`/admin/popups/edit?id=${popup.id}`)}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            <Pencil size={13} /> 수정
          </button>
        </div>
      </div>

      {/* 심사 카드 — 대기·반려 상태에서만 */}
      {reviewable && (
        <div className="bg-white border border-accent/40 rounded-sm p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck size={14} className="text-accent" /> 심사 {popup.status === "REJECTED" && <span className="text-xs font-normal text-muted-foreground">(반려된 팝업 재심사)</span>}
          </div>
          {popup.status === "REJECTED" && popup.rejectReason && (
            <div className="bg-red-50 border border-red-200 rounded-sm px-3 py-2 text-xs text-red-600">기존 반려 사유: {popup.rejectReason}</div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5">반려 사유 (반려 시 필수 · 주최자에게 전달됨)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 대표 이미지 화질 기준 미달"
                className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => decide("reject")}
                disabled={acting}
                className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-sm border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 bg-white"
              >
                {acting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} 반려
              </button>
              <button
                onClick={() => decide("approve")}
                disabled={acting}
                className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {acting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 승인·게시
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 반려 사유 (심사 카드가 없는 게시중지 상태 등) */}
      {popup.status === "REJECTED" && suspended && popup.rejectReason && (
        <div className="bg-slate-100 border border-slate-200 rounded-sm px-4 py-3 text-xs text-slate-600">{popup.rejectReason}</div>
      )}

      {/* 핵심 정보 */}
      <div className="bg-white border border-border rounded-sm p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
        <div className="flex items-start gap-2.5">
          <Building2 size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-muted-foreground mb-0.5">주최자(브랜드)</div>
            <div>{popup.companyName} <span className="text-xs text-muted-foreground">· business #{popup.businessId}</span></div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <CalendarClock size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-muted-foreground mb-0.5">운영 기간 · 시간</div>
            <div>{fmtDate(popup.startDate)} ~ {fmtDate(popup.endDate)}</div>
            {fmtTime(popup.startDate) && (
              <div className="text-xs text-muted-foreground mt-0.5">매일 {fmtTime(popup.startDate)} — {fmtTime(popup.endDate)}</div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <MapPin size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-muted-foreground mb-0.5">공간(위치)</div>
            <div>{popup.location ?? "-"}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Ticket size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-muted-foreground mb-0.5">운영 방식</div>
            <div>{popup.queueMode ? QUEUE_MODE_LABEL[popup.queueMode] ?? popup.queueMode : "-"}</div>
            {popup.reservationMode === "SLOT" && popup.avgExperienceMinutes != null && (
              <div className="text-xs text-muted-foreground mt-0.5">슬롯 단위 {popup.avgExperienceMinutes}분</div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Users size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-muted-foreground mb-0.5">최대 수용 정원</div>
            <div>{popup.capacity != null ? `${popup.capacity}명` : "-"}</div>
          </div>
        </div>
      </div>

      {/* 소개글 */}
      <div className="bg-white border border-border rounded-sm">
        <div className="px-5 py-3 border-b border-border text-sm font-semibold">소개글</div>
        <p className="p-5 text-[13px] leading-relaxed whitespace-pre-wrap">{popup.description || "(소개글 없음)"}</p>
      </div>
    </div>
  );
}
