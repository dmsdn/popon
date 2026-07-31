import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Pencil, Trash2, Loader2, MapPin, CalendarClock, Users,
  Ticket, ShieldAlert, MessageSquare, Info, Image as ImageIcon, X,
} from "lucide-react";
import { getPopup, deletePopup, Popup, PopupStatusCode } from "../../lib/api";
import { getMeta, isSuspended } from "../../lib/adminPopupMeta";
import { loadOpsMode } from "../../lib/walkinQueue";

// 팝업 상세페이지 — 7/24 멘토 피드백: 조회 표에서 제목 클릭 시 진입.
// 삭제는 표에서 제거하고 이 페이지에서만 가능 (실수 삭제 방지).

const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "게시중지",
};
const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
  SUSPENDED: "bg-orange-50 text-orange-500 border-orange-200",
};

// 운영 방식 표기 — 서버 queueMode 우선, 없으면 로컬 저장값(구버전 등록분) 폴백
const QUEUE_MODE_LABEL: Record<string, string> = {
  PRERESERVATION_ONLY: "사전예약만",
  ONSITE_WAITING_ONLY: "현장 웨이팅만",
  BOTH: "사전예약 + 현장 웨이팅",
  RESERVATION: "사전예약만",
  WALKIN: "현장 웨이팅만",
};

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");
const fmtTime = (iso: string | null) => (iso ? iso.slice(11, 16) : "");

export default function PopupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null); // 이미지 확대 보기 (7/29)

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

  const handleDelete = async () => {
    if (!popup) return;
    if (!window.confirm(`「${popup.title}」 팝업을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      await deletePopup(popup.id);
      navigate("/seller/popups");
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{loadError}</div>
        <Link to="/seller/popups" className="text-xs text-accent underline underline-offset-2">팝업 조회/수정으로 돌아가기</Link>
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

  const meta = getMeta(popup.id);
  const suspended = isSuspended(popup.status, popup.rejectReason);
  const adminNote = popup.adminEditNote ?? meta.editNote; // 서버 기록 우선, 구 로컬 기록 폴백
  const opsLabel = QUEUE_MODE_LABEL[popup.queueMode ?? loadOpsMode(popup.id)] ?? "-";

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/seller/popups")} className="text-muted-foreground hover:text-foreground" title="목록으로">
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
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/seller/popups/new?id=${popup.id}`}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            <Pencil size={13} /> 수정
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 삭제
          </button>
        </div>
      </div>

      {/* 반려 사유 */}
      {popup.status === "REJECTED" && !suspended && popup.rejectReason && (
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">
          <span className="font-semibold">반려 사유:</span> {popup.rejectReason}
        </div>
      )}

      {/* 관리자 수정사항·사유 */}
      {adminNote && (
        <div className="bg-card border border-accent/30 rounded-sm p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-2">
            <ShieldAlert size={12} /> 관리자 수정사항 및 사유
            {(popup.statusChangedAt || meta.editDate) && (
              <span className="font-normal text-muted-foreground">· {fmtDate(popup.statusChangedAt) !== "-" ? fmtDate(popup.statusChangedAt) : meta.editDate}</span>
            )}
          </div>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{adminNote}</p>
        </div>
      )}

      {/* 핵심 정보 */}
      <div className="bg-card border border-border rounded-sm p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
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
            <div>{opsLabel}</div>
            {popup.reservationMode === "SLOT" && popup.avgExperienceMinutes != null && (
              <div className="text-xs text-muted-foreground mt-0.5">슬롯 단위 {popup.avgExperienceMinutes}분 (체험 소요시간)</div>
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

      {/* 썸네일 이미지 — 7/29 GET 이미지 연동 (findById 응답의 thumbnailImages, 클릭 시 확대) */}
      {(popup.thumbnailImages?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-sm">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
            <ImageIcon size={14} className="text-muted-foreground" /> 썸네일 이미지
            <span className="text-xs font-normal text-muted-foreground">{popup.thumbnailImages!.length}장 · 클릭하면 크게 볼 수 있습니다</span>
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {popup.thumbnailImages!.map((url, i) => (
              <button key={url} type="button" onClick={() => setViewerUrl(url)} className="group relative aspect-square overflow-hidden rounded-sm border border-border">
                <img src={url} alt={`썸네일 ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 상세 설명 */}
      <div className="bg-card border border-border rounded-sm">
        <div className="px-5 py-3 border-b border-border text-sm font-semibold">상세 설명</div>
        <p className="p-5 text-[13px] leading-relaxed whitespace-pre-wrap">{popup.description}</p>
        {/* 상세 설명 이미지 — 본문 아래 세로로 이어붙임 (쿠팡 상세 스타일, sortOrder 순) */}
        {(popup.detailImages?.length ?? 0) > 0 && (
          <div className="border-t border-border p-5 flex flex-col items-center gap-3">
            {popup.detailImages!.map((url, i) => (
              <img key={url} src={url} alt={`상세 이미지 ${i + 1}`} className="w-full max-w-xl rounded-sm border border-border cursor-zoom-in" onClick={() => setViewerUrl(url)} />
            ))}
          </div>
        )}
      </div>

      {/* 이미지 확대 보기 모달 */}
      {viewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setViewerUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" title="닫기">
            <X size={22} />
          </button>
          <img src={viewerUrl} alt="확대 보기" className="max-w-full max-h-full rounded-sm" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* 바로가기 */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/seller/inquiries?popup=${encodeURIComponent(popup.title)}`}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          <MessageSquare size={12} /> 이 팝업에 대해 관리자에게 문의
        </Link>
        {popup.reservationMode === "SLOT" && (
          <Link
            to={`/seller/reservations?popup=${popup.id}`} // 7/29 — 이동하면 이 팝업이 셀렉트에 바로 선택됨
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <CalendarClock size={12} /> 예약 슬롯·명단 보기
          </Link>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Info size={11} /> 팝업 삭제는 이 상세페이지에서만 가능합니다. 예약·슬롯이 연결된 팝업은 서버에서 삭제가 거부될 수 있습니다.
      </p>
    </div>
  );
}
