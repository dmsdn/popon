import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { Loader2, LogOut, QrCode, UserPlus, CheckCircle2, XCircle, Info, Clock3, X, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyPopups, getSlots, getPopupReservations, checkinReservation, markNoShow,
  getQueueBoard, checkinUnifiedQr, exitUnifiedQr, registerWaiting, enterWaiting, noShowWaiting,
  Popup, PopupSlot, PopupStatusCode, ReservationDetail, UnifiedEntry,
} from "../../lib/api";
import {
  loadOpsMode, OpsMode,
} from "../../lib/walkinQueue";
import { isSuspended } from "../../lib/adminPopupMeta";
import { CONSUMER_SIGNUP_URL } from "../../lib/siteUrls";
import { restoreSelectedPopup, saveSelectedPopup } from "../../lib/popupSelection";

// 대기열·인원 관제 — 예약·웨이팅 통합관리 (jsw waiting·unified queue 백엔드 실연동)
// 실연동: 통합 대기열 보드(서버가 사전예약 자동 편입·정렬), 웨이팅 등록/입장/취소, 예약 체크인/노쇼
// 로컬로 남은 것: 운영 모드 저장 폴백(구 팝업 한정 — 신규는 서버 queueMode 사용)
// ※ 퇴장 처리는 POST /api/queue/exit/qr로 실연동돼 있다 (7/29 주석 정정 — 예전 문구가 낡아 있었음)

// 8/3 — QR 관련 UI(입장 스캔·비치용 QR 2종)는 현장 접수 웹(checkin 앱)으로 이관하기로 해
// 화면에서 내렸다. 코드는 지우지 않고 이 플래그로 꺼 둔다 — 복구는 true 한 줄.
const SHOW_QR_TOOLS = false;

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : "");
const fmtClock = (iso: string | null | undefined) => (iso ? iso.slice(11, 16) : "");

// 로컬 기준 YYYY-MM-DD (toISOString은 UTC라 자정 근처에 날짜가 하루 밀린다 — 사용 금지)
const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const dateLabel = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  return `${ymd.slice(5).replace("-", "/")} (${DOW[d.getDay()]})`;
};

// 팝업 선택 셀렉트의 상태 표기 (PopupList와 같은 규약)
const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "게시중지",
};

const MODE_LABEL: Record<OpsMode, string> = {
  RESERVATION: "사전예약만",
  WALKIN: "현장 웨이팅만",
  BOTH: "둘 다 운영",
};

// 처리 열 공용 렌더 (8/3) — 대기중이면 입장/노쇼 버튼, 처리 후에는 상태 배지.
// 행을 지우는 대신 배지로 남겨 명단이 당일 기록지 역할을 하게 한다.
function QueueActions<T extends {
  key: string;
  status: "WAITING" | "ENTERED" | "NO_SHOW" | "CANCELLED";
  enteredAt: string | null;
}>({
  row, actingKey, readOnly, onEnter, onNoShow,
}: {
  row: T;
  actingKey: string | null;
  readOnly: boolean; // 지난 날짜는 확정된 기록이라 처리 버튼을 열지 않는다 (8/4)
  onEnter: (row: T) => void;
  onNoShow: (row: T) => void;
}) {
  const badge = (cls: string, icon: React.ReactNode, text: string) => (
    <div className="flex justify-center">
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>
        {icon} {text}
      </span>
    </div>
  );

  if (row.status === "NO_SHOW") {
    return badge("bg-red-50 text-red-500 border-red-200", <XCircle size={10} />, "미입장");
  }
  if (row.status === "CANCELLED") {
    return badge("bg-slate-100 text-slate-500 border-slate-200", <XCircle size={10} />, "취소됨");
  }
  if (row.status === "ENTERED") {
    return badge("bg-emerald-50 text-emerald-600 border-emerald-200", <CheckCircle2 size={10} />,
      `입장처리됨${row.enteredAt ? ` ${fmtClock(row.enteredAt)}` : ""}`);
  }
  // 대기중인데 지난 날짜라면 자정 리셋 전 상태다 — 곧 미입장으로 확정된다
  if (readOnly) {
    return badge("bg-amber-50 text-amber-600 border-amber-200", <Clock3 size={10} />, "미처리");
  }
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onEnter(row)}
        disabled={actingKey === row.key}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
      >
        <CheckCircle2 size={11} /> 입장
      </button>
      <button
        onClick={() => onNoShow(row)}
        disabled={actingKey === row.key}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
      >
        <XCircle size={11} /> 노쇼
      </button>
    </div>
  );
}

export default function WaitingControl() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [roster, setRoster] = useState<ReservationDetail[]>([]);
  const [board, setBoard] = useState<UnifiedEntry[]>([]);
  const [mode, setMode] = useState<OpsMode>("BOTH");
  // 8/3 — 슬롯 필터 폐지: 현장 대기열은 회차 구분 없는 전체 대기 하나다 (아래 개편 주석 참고)
  // 8/4 — 대신 「날짜」로 끊는다. 대기열의 단위는 회차가 아니라 하루다.
  const [day, setDay] = useState(() => localDateStr(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // 수동 추가 폼 (현장 직원용 — 백엔드 웨이팅 등록 API 사용, 비회원은 이름·이메일·전화 필수)
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", partySize: 1, phone: "", email: "" });
  const [adding, setAdding] = useState(false);

  // ── QR 카메라 스캔 입장 — 통합 체크인(예약·웨이팅 QR 구분 없이 하나의 API) ──
  const [scanOpen, setScanOpen] = useState(false);
  const [camError, setCamError] = useState("");
  const [qrMsg, setQrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualQr, setManualQr] = useState(""); // 카메라 불가 시 폴백 입력
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanRef = useRef<{ v: string; t: number }>({ v: "", t: 0 });

  useEffect(() => {
    if (!isBusiness) return;
    getMyPopups()
      .then((list) => {
        setPopups(list);
        // 8/5 — 다른 화면에서 고른 팝업이 있으면 그걸 먼저 잡는다 (없으면 첫 팝업)
        if (list.length > 0) setPopupId((prev) => prev ?? restoreSelectedPopup(list, list[0].id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."));
  }, [isBusiness]);

  // 서버 데이터 로드 + 30초마다 갱신 (통합 보드가 사전예약 자동 편입·웨이팅 접수를 반영)
  const refreshBoard = (pid: number) => {
    getQueueBoard(pid, day).then((b) => setBoard(b.entries)).catch(() => {});
    getPopupReservations(pid).then(setRoster).catch(() => {});
  };

  useEffect(() => {
    if (!popupId) return;
    let alive = true;
    const fetchAll = (withSpinner: boolean) => {
      if (withSpinner) setLoading(true);
      Promise.all([getSlots(popupId), getPopupReservations(popupId), getQueueBoard(popupId, day)])
        .then(([s, r, b]) => {
          if (!alive) return;
          setSlots(s);
          setRoster(r);
          setBoard(b.entries);
          setError("");
        })
        .catch((e) => alive && setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
        .finally(() => alive && withSpinner && setLoading(false));
      setNowMs(Date.now());
    };
    fetchAll(true);
    // 운영 방식은 팝업 등록/수정에서 확정 — 여기서는 표시만 (FREE 팝업은 현장 웨이팅만)
    // 서버 queueMode 우선(7/24 DTO 연동), 값이 없는 구 팝업만 로컬 저장 폴백
    const p = popups.find((x) => x.id === popupId);
    const qm = p?.queueMode;
    setMode(
      p?.reservationMode === "FREE" ? "WALKIN"
        : qm === "PRERESERVATION_ONLY" ? "RESERVATION"
        : qm === "ONSITE_WAITING_ONLY" ? "WALKIN"
        : qm === "BOTH" ? "BOTH"
        : loadOpsMode(popupId),
    );
    // 지난 날짜는 더 이상 변하지 않는 기록이라 폴링하지 않는다 — 오늘일 때만 30초 갱신
    const t = day === localDateStr(new Date()) ? setInterval(() => fetchAll(false), 30_000) : null;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupId, day]);

  const selected = popups.find((p) => p.id === popupId) ?? null;

  // 8/5 — 마지막 선택을 기억해 명단·성과·공지에서도 같은 팝업이 잡히게 한다
  useEffect(() => { if (popupId != null) saveSelectedPopup(popupId); }, [popupId]);
  const slotMap = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots]);
  // 예약 상세(슬롯·입장 시각)를 보드 행에 붙이기 위한 맵 — 보드 응답에는 refId(예약 id)만 있다
  const rosterById = useMemo(() => Object.fromEntries(roster.map((r) => [r.id, r])), [roster]);

  // ── 8/3 전면 개편: 슬롯별 보기 폐지 ──
  //
  // 회차를 골라 보는 방식은 「웨이팅을 어느 회차에 매길 것인가」라는 답 없는 문제를
  // 계속 만들었다 (7/31 joinedAt 오매칭 → 8/3 「이전 대기」 응급 구역까지).
  // 현장 운영의 실제 단위는 회차가 아니라 **지금 줄** 하나다. 그래서
  //   - 현장 대기열은 전체 대기 하나. 사전예약/현장 웨이팅 표 둘로만 나눈다
  //   - 사전예약은 슬롯 시작 시각이 되면 서버 보드가 자동 편입한다 (기존 동작 그대로 —
  //     아직 시작 전인 회차는 우측 「대기 현황」의 자동 편입 예고로 보인다)
  //   - 입장·노쇼를 처리해도 행을 숨기지 않고 상태 배지로 남긴다 — 명단이 곧 당일 기록지다
  type QueueRow = {
    key: string;
    source: "RESERVATION" | "ONSITE_WAITING";
    refId: number;
    name: string;
    contact: string;
    partySize: number;
    joinedAt: string | null; // 웨이팅 = 등록 시각 (예약은 서버가 다른 의미로 채워 표기에 안 씀)
    slotLabel: string;       // 사전예약의 예약 회차 "MM-DD HH:MM" (웨이팅은 "-")
    enteredAt: string | null;
    // 8/4 — 미입장(노쇼 버튼·자정 리셋)은 취소와 별도 상태다.
    // 웨이팅에도 NO_SHOW가 생겨 예약과 같은 문자열로 판별한다.
    status: "WAITING" | "ENTERED" | "NO_SHOW" | "CANCELLED";
  };

  const slotLabelOf = (slotId: number | null | undefined): string => {
    if (slotId == null) return "-";
    const s = slotMap[slotId];
    return s ? `${s.slotDate.slice(5)} ${s.startTime.slice(0, 5)}` : "-";
  };

  const toRow = (e: UnifiedEntry): QueueRow => {
    const entered = e.entryStatus === "CHECKED_IN" || e.entryStatus === "ENTERED";
    const detail = e.source === "RESERVATION" ? rosterById[e.refId] : undefined;
    return {
      key: `${e.source}-${e.refId}`,
      source: e.source,
      refId: e.refId,
      name: e.displayName,
      contact: e.phoneNumber ?? "-",
      partySize: e.partySize,
      joinedAt: e.joinedAt,
      slotLabel: e.source === "RESERVATION" ? slotLabelOf(detail?.slotId) : "-",
      // 입장 엔트리의 joinedAt은 서버가 입장 시각으로 채운다 — 예약은 명단 상세(checkedInAt)로 보정
      enteredAt: entered ? ((detail?.checkedInAt ?? null) || e.joinedAt) : null,
      status: entered
        ? "ENTERED"
        // 예약·웨이팅 모두 NO_SHOW로 통일됨 (8/4) — cancelReason 분기 폐기
        : e.entryStatus === "NO_SHOW"
          ? "NO_SHOW"
          : e.entryStatus === "CANCELLED"
            ? "CANCELLED"
            : "WAITING",
    };
  };

  // 표 2개 — 서버 보드 순서(joinedAt 정렬)를 그대로 따른다
  const reservationRows = useMemo(
    () => board.filter((e) => e.source === "RESERVATION").map(toRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, rosterById, slotMap],
  );
  const walkinRows = useMemo(
    () => board.filter((e) => e.source === "ONSITE_WAITING").map(toRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, rosterById, slotMap],
  );
  const waitingTeams = useMemo(
    () => [...reservationRows, ...walkinRows].filter((r) => r.status === "WAITING"),
    [reservationRows, walkinRows],
  );

  // ── 운영 날짜 목록 (8/4) ──
  // 팝업 등록 때 정한 운영기간을 하루 단위로 펼친다. 지난 날짜를 고르면 그날 명단을
  // 기록 그대로 볼 수 있다(자정 리셋으로 미처리분이 「미입장」으로 확정돼 있다).
  // 오늘이 운영기간 밖이면(운영 전·종료 후) 오늘도 목록에 넣어 화면이 비지 않게 한다.
  const todayStr = localDateStr(new Date(nowMs));
  const operatingDays = useMemo(() => {
    const days: string[] = [];
    const s = selected?.startDate?.slice(0, 10);
    const e = selected?.endDate?.slice(0, 10);
    if (s && e) {
      const cur = new Date(`${s}T00:00:00`);
      const end = new Date(`${e}T00:00:00`);
      // 운영기간이 아주 길어도 셀렉트가 감당할 범위(최대 120일)로 자른다
      for (let i = 0; i < 120 && cur <= end; i++) {
        days.push(localDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    if (!days.includes(todayStr)) days.push(todayStr);
    return days.sort();
  }, [selected?.startDate, selected?.endDate, todayStr]);

  const isPastDay = day < todayStr;
  const isFutureDay = day > todayStr;
  const readOnlyDay = isPastDay || isFutureDay;

  // 팝업을 바꾸면 그 팝업의 오늘로 돌아간다 (남의 팝업 날짜가 남아 있으면 빈 화면이 뜬다)
  useEffect(() => {
    setDay(localDateStr(new Date()));
  }, [popupId]);

  // ── 체류 인원: 서버 통합 보드의 입장완료(CHECKED_IN/ENTERED) 중 **아직 퇴장하지 않은** 엔트리 ──
  //
  // 8/4 — exitedAt 조건이 빠져 이미 나간 사람이 체류 인원에 남는 사고가 있었다.
  // 보드를 하루치 명단 전체로 바꾸면서(입장·노쇼 배지를 남기려고) 퇴장자까지 함께 오게 됐는데,
  // entryStatus는 퇴장 후에도 CHECKED_IN 그대로라 이 필터만으로는 구분이 안 됐다.
  // 증상: 7/31 손님이 며칠 뒤에도 체류 목록에 보이고, 퇴장을 누르면 서버가
  //       「이미 퇴장 처리된 예약입니다」로 거절 (AutoExitScheduler가 30분 뒤 자동 퇴장시킨 건들).
  type StayRow = { key: string; source: "RESERVATION" | "ONSITE_WAITING"; refId: number; name: string; partySize: number; enteredAt: string | null; qrToken: string };
  const staying = useMemo<StayRow[]>(() => {
    return board
      .filter((e) => (e.entryStatus === "CHECKED_IN" || e.entryStatus === "ENTERED") && !e.exitedAt)
      .map((e) => ({
        key: `${e.source}-${e.refId}`,
        source: e.source,
        refId: e.refId,
        name: e.displayName,
        partySize: e.partySize,
        // 체류 엔트리의 joinedAt = 입장 시각(서버가 checkedInAt/enteredAt으로 채움); 예약은 명단 상세로 보정
        enteredAt: (e.source === "RESERVATION" ? rosterById[e.refId]?.checkedInAt : null) ?? e.joinedAt,
        qrToken: e.qrToken, // 퇴장 처리(exitUnifiedQr)에 사용
      }))
      .sort((a, b) => (a.enteredAt ?? "").localeCompare(b.enteredAt ?? ""));
  }, [board, rosterById]);

  const stayingCount = staying.reduce((a, r) => a + r.partySize, 0);
  // 혼잡도 정원 = 팝업 등록의 「최대 수용 정원」(동시 체류 기준)
  const capacity = selected?.capacity ?? null;
  const rate = capacity ? Math.round((stayingCount / capacity) * 100) : null;
  const level = rate === null ? null : rate >= 80 ? "혼잡" : rate >= 50 ? "보통" : "여유";
  const levelColor = rate === null ? "" : rate >= 80 ? "text-red-500" : rate >= 50 ? "text-amber-500" : "text-emerald-500";
  const barColor = rate === null ? "" : rate >= 80 ? "bg-red-500" : rate >= 50 ? "bg-amber-500" : "bg-emerald-500";

  // 아직 시작 전인 슬롯의 사전예약 인원 (자동 편입 예정 안내)
  const upcoming = useMemo(() => {
    const now = new Date(nowMs);
    return slots
      .filter((s) => new Date(`${s.slotDate}T${s.startTime}`) > now)
      .map((s) => ({ slot: s, count: roster.filter((r) => r.slotId === s.id && r.status !== "CANCELLED").length }))
      .filter((x) => x.count > 0)
      .slice(0, 4);
  }, [slots, roster, nowMs]);

  // ── 처리 핸들러 ──
  const handleEnter = async (row: QueueRow) => {
    if (!popupId) return;
    setActingKey(row.key);
    try {
      if (row.source === "RESERVATION") {
        await checkinReservation(row.refId); // 서버가 입장 시각 기록
      } else {
        await enterWaiting(row.refId); // 입장 완료자는 이제 통합 보드가 반환 — 로컬 기록 불필요
      }
      refreshBoard(popupId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "입장 처리에 실패했습니다.");
    } finally {
      setActingKey(null);
    }
  };

  const handleNoShow = async (row: QueueRow) => {
    if (!popupId) return;
    if (!window.confirm(`${row.name}님을 노쇼로 처리할까요?`)) return;
    setActingKey(row.key);
    try {
      if (row.source === "RESERVATION") await markNoShow(row.refId);
      else await noShowWaiting(row.refId); // 8/4 — 웨이팅도 전용 노쇼 API (취소와 분리)
      refreshBoard(popupId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setActingKey(null);
    }
  };

  // 퇴장 처리 — 7/23 신규 통합 퇴장 API(예약·웨이팅 공통, 서버가 exitedAt 기록)
  const handleExit = async (row: StayRow) => {
    if (!popupId) return;
    setActingKey(`exit-${row.key}`);
    try {
      await exitUnifiedQr(row.qrToken, popupId);
      refreshBoard(popupId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "퇴장 처리에 실패했습니다.");
    } finally {
      setActingKey(null);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupId) return;
    setAdding(true);
    try {
      await registerWaiting(popupId, {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phoneNumber: addForm.phone.trim(),
        partySize: addForm.partySize,
      });
      setAddForm({ name: "", partySize: 1, phone: "", email: "" });
      setAddOpen(false);
      refreshBoard(popupId); // 전체 대기 하나라 뷰 조작 없이 갱신만 하면 바로 보인다 (8/3)
    } catch (err) {
      alert(err instanceof Error ? err.message : "대기 추가에 실패했습니다.");
    } finally {
      setAdding(false);
    }
  };

  // 스캔·입력값에서 토큰만 뽑는다 (7/31).
  //
  // 손님이 보여 주는 QR에는 **토큰이 아니라 주소**가 들어 있다 —
  // 소비자 앱의 QRCodeDisplay가 `{origin}/qr/{token}` 으로 만들고,
  // 백엔드가 문자·메일로 보내는 안내도 같은 형식이다.
  // 그런데 서버는 `findByQrToken(값)`으로 **토큰을 그대로** 찾는다.
  // 스캔한 문자열을 그대로 보내면 URL 전체가 토큰으로 조회돼 항상 실패했다.
  //
  // 직원이 토큰만 손으로 입력하는 경우도 있으므로 **양쪽 다 받아** 준다.
  const extractQrToken = (raw: string) => {
    const v = raw.trim();
    const m = v.match(/\/qr\/([^/?#\s]+)/); // ".../qr/{token}" 형태면 뒤쪽만
    return m ? m[1] : v;
  };

  const processQrValue = async (raw: string) => {
    const v = extractQrToken(raw);
    if (!v || !popupId) return;
    try {
      // 통합 QR 체크인 — 예약·웨이팅 QR 모두 서버가 판별해 입장 처리·시각 기록
      // popupId를 함께 보낸다 (7/31): 그러지 않으면 서버가 「내 팝업인가」까지만 보기 때문에
      // 팝업을 여러 개 운영하는 주최자는 여기서 **다른 팝업 손님의 QR도 입장 처리**해 버린다.
      const entry = await checkinUnifiedQr(v, popupId);
      setQrMsg({ ok: true, text: `${entry.displayName}님(${entry.source === "RESERVATION" ? "사전예약" : "현장 웨이팅"}) 입장 처리 완료` });
      refreshBoard(popupId);
    } catch (err) {
      setQrMsg({ ok: false, text: err instanceof Error ? err.message : "QR 입장 처리에 실패했습니다." });
    }
  };

  // 스캔 모달이 열리면 카메라 시작 → 프레임마다 jsQR로 디코드 → 값이 잡히면 입장 처리
  useEffect(() => {
    if (!scanOpen) return;
    setCamError("");
    setQrMsg(null);
    let stream: MediaStream | null = null;
    let raf = 0;
    let active = true;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        video.play().catch(() => {});
        const tick = () => {
          if (!active) return;
          if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code?.data) {
              const now = Date.now();
              // 같은 QR 연속 인식 방지 (3초 쿨다운)
              if (code.data !== lastScanRef.current.v || now - lastScanRef.current.t > 3000) {
                lastScanRef.current = { v: code.data, t: now };
                processQrValue(code.data);
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setCamError("카메라를 사용할 수 없습니다. 아래에 QR 값을 직접 입력해 주세요."));
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen, popupId]);

  if (!isBusiness) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">대기열·인원 관제</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          주최자(사업자) 계정으로 로그인해야 사용할 수 있습니다.{" "}
          <Link to="/login" state={{ from: "/seller/waiting" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">대기열·인원 관제</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            사전예약·현장 웨이팅을 하나의 대기열로 통합 관리합니다.
          </p>
        </div>
        {popups.length > 0 && (
          <select
            value={popupId ?? ""}
            onChange={(e) => setPopupId(Number(e.target.value))}
            className="px-3 py-2 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
          >
            {/* 8/4 — 상태를 앞에 붙인다. 관제는 진행중 팝업에서 쓰는 화면인데 셀렉트에는
                심사 대기·반려까지 전부 섞여 있어, 대기열이 비어 있을 때 그게 「손님이 없어서」인지
                「아직 게시도 안 된 팝업이라서」인지 구분이 안 됐다.
                게시중지는 status가 아니라 반려 마커로 표현된 옛 데이터가 있어 isSuspended로 판정한다. */}
            {popups.map((p) => (
              <option key={p.id} value={p.id}>
                [{isSuspended(p.status, p.rejectReason) ? "게시중지" : STATUS_LABEL[p.status]}] {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/*<div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          통합 대기열(사전예약 자동 편입)·웨이팅 접수/입장/취소·QR 체크인·<strong>퇴장 처리·체류 인원·운영 방식(queueMode)</strong>까지 전부 <strong>백엔드 실연동</strong>.
          (7/24 이전 등록 팝업의 운영 방식만 로컬 기록 폴백)
        </div>
      </div>*/}

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {popups.length === 0 && !error && (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. <Link to="/seller/popups/new" className="text-accent underline underline-offset-2">팝업을 먼저 등록</Link>해 주세요.
        </div>
      )}

      {selected && (
        <>
          {/* ── 운영 방식 (팝업 등록/수정에서 확정 — 여기서는 표시만) ── */}
          <div className="bg-card border border-border rounded-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">운영 방식</span>
              <div className="flex gap-1">
                {(["RESERVATION", "WALKIN", "BOTH"] as OpsMode[]).map((m) => (
                  <span
                    key={m}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      mode === m ? "bg-foreground text-primary-foreground border-foreground font-medium" : "border-border text-muted-foreground/50"
                    }`}
                  >
                    {MODE_LABEL[m]}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">팝업 등록/수정의 「예약·입장 정책」에서 변경할 수 있습니다</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              플랫폼은 예약·웨이팅 <strong>통합관리 도구</strong>만 제공합니다. 사전예약과 현장 웨이팅을 동시에 운영할 때의
              현장 대기열 조정 의무는 주최자에게 있으며, 현장 직원이 시간 슬롯·사전예약 인원·혼잡도를 고려해 운영해 주세요.
            </p>
          </div>

          {/* ── 현재 체류 인원 (퇴장 처리만 가능) ── */}
          <div className="grid lg:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">현재 체류 인원</span>
                {/*{level && <span className={`text-sm font-bold ${levelColor}`}>{level}</span>}*/}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-semibold">{stayingCount}</span>
                <span className="text-sm text-muted-foreground mb-1">
                  {capacity ? `/ 정원 ${capacity}명 (${rate}%)` : "명 (최대 수용 정원 미설정)"}
                </span>
              </div>
              {rate !== null && (
                <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
                  <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                </div>
              )}
              {/* 체류자 목록 — 입장은 대기열 표에서만, 여기서는 퇴장 처리만 */}
              <div className="mt-3 flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                {staying.length === 0 && <span className="text-xs text-muted-foreground">현재 체류 중인 인원이 없습니다.</span>}
                {staying.map((r) => (
                  <div key={`stay-${r.key}`} className="flex items-center gap-2 text-xs bg-secondary/50 rounded-sm px-3 py-2">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{r.partySize}명 · 입장 {fmtClock(r.enteredAt)}</span>
                    <button
                      onClick={() => handleExit(r)}
                      className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    >
                      <LogOut size={11} /> 퇴장
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-sm p-5 flex flex-col">
              <div className="text-sm font-semibold mb-3">대기 현황</div>
              <div className="text-3xl font-semibold">
                {waitingTeams.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">팀</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                총 {waitingTeams.reduce((a, r) => a + r.partySize, 0)}명 대기 중
                {mode === "BOTH" && (
                  <> · 사전예약 {reservationRows.filter((r) => r.status === "WAITING").length} · 현장 {walkinRows.filter((r) => r.status === "WAITING").length}</>
                )}
              </div>
              {upcoming.length > 0 && (
                <div className="text-[11px] text-muted-foreground bg-secondary/70 rounded-sm p-3 mt-4 leading-relaxed">
                  <Clock3 size={11} className="inline mr-1" />
                  {upcoming.map(({ slot, count }) => (
                    <div key={slot.id}>
                      {slot.slotDate.slice(5)} {fmtTime(slot.startTime)} 슬롯 시작 시 사전예약 {count}명 자동 편입
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── QR 입장 처리: 카메라 스캔 — 8/3 현장 접수 웹(checkin)으로 이관, 화면에서 내림 ── */}
          {SHOW_QR_TOOLS && (
            <div className="bg-card border border-border rounded-sm p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <QrCode size={15} className="text-accent" /> QR 입장 처리
              </div>
              <button
                onClick={() => setScanOpen(true)}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Camera size={13} /> QR코드 읽기
              </button>
              <span className="text-[11px] text-muted-foreground">
                사전예약·현장 웨이팅 QR 구분 없이 스캔 즉시 입장 처리되고 시각이 기록됩니다
              </span>
              {qrMsg && !scanOpen && (
                <span className={`w-full text-xs ${qrMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{qrMsg.text}</span>
              )}
            </div>
          )}

          {/* ── 날짜 선택 (8/4 신설) ──
              대기열의 단위는 회차가 아니라 하루다. 팝업 운영기간을 일별로 펼쳐 고르게 하고,
              지난 날짜를 고르면 그날 명단을 기록 그대로 본다(처리 버튼은 잠긴다).
              매일 자정 5분에 서버가 전날 미처리분을 「미입장」으로 확정하고 대기열을 비운다. */}
          <div className="bg-card border border-border rounded-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">운영 날짜</span>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="text-[12px] px-2.5 py-1.5 border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {operatingDays.map((d) => (
                <option key={d} value={d}>
                  {dateLabel(d)}{d === todayStr ? " · 오늘" : ""}
                </option>
              ))}
            </select>
            {day !== todayStr && (
              <button
                onClick={() => setDay(todayStr)}
                className="text-[11px] px-2 py-1 rounded-sm border border-border text-muted-foreground hover:border-accent hover:text-accent"
              >
                오늘로
              </button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {isPastDay
                ? "지난 날짜의 확정된 기록입니다 — 처리할 수 없습니다"
                : isFutureDay
                  ? "아직 오지 않은 날짜입니다 — 예약 명단만 미리 볼 수 있습니다"
                  : "매일 자정이 지나면 미처리 건이 「미입장」으로 확정되고 대기열이 비워집니다"}
            </span>
          </div>

          {/* ── 현장 대기열 — 전체 대기 하나, 사전예약·현장 웨이팅 표 2개 (8/3 전면 개편) ──
              입장·노쇼를 처리해도 행이 사라지지 않는다: 상태 열에 배지로 남아
              명단이 곧 그날의 기록지가 된다. */}
          {mode !== "WALKIN" && (
            <div className="bg-card border border-border rounded-sm overflow-x-auto">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">현장 대기열 — 사전예약</span>
                <span className="text-[11px] text-muted-foreground">
                  {readOnlyDay ? `${dateLabel(day)} 예약 명단` : "슬롯 시작 시각이 되면 그 회차 예약 명단이 자동으로 들어옵니다"}
                </span>
              </div>
              {loading ? (
                <div className="text-center text-xs text-muted-foreground py-10">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </div>
              ) : (
                <table className="w-full text-[13px] min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2.5">순번</th>
                      <th className="text-left font-medium px-4 py-2.5">예약 회차</th>
                      <th className="text-left font-medium px-4 py-2.5">이름</th>
                      <th className="text-left font-medium px-4 py-2.5">연락처</th>
                      <th className="text-right font-medium px-4 py-2.5">인원</th>
                      <th className="text-center font-medium px-4 py-2.5">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reservationRows.map((row, i) => (
                      <tr key={row.key} className={row.status === "NO_SHOW" || row.status === "CANCELLED" ? "opacity-60" : row.status === "ENTERED" ? "bg-emerald-50/40" : "hover:bg-secondary/40"}>
                        <td className="px-4 py-2.5 font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>#{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{row.slotLabel}</td>
                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.contact}</td>
                        <td className="px-4 py-2.5 text-right">{row.partySize}명</td>
                        <td className="px-4 py-2.5">
                          <QueueActions row={row} actingKey={actingKey} readOnly={readOnlyDay} onEnter={handleEnter} onNoShow={handleNoShow} />
                        </td>
                      </tr>
                    ))}
                    {reservationRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                          {readOnlyDay ? `${dateLabel(day)}에 예약된 건이 없습니다.` : "아직 편입된 사전예약이 없습니다. 슬롯 시작 시간이 되면 예약자가 자동으로 들어옵니다."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {mode !== "RESERVATION" && (
            <div className="bg-card border border-border rounded-sm overflow-x-auto">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">현장 대기열 — 현장 웨이팅</span>
                <span className="text-[11px] text-muted-foreground">
                  {readOnlyDay ? `${dateLabel(day)} 접수 명단` : "줄 선 순서 그대로의 그날 전체 대기입니다"}
                </span>
                {/* 수동 추가는 오늘만 — 지난 날짜에 손님을 끼워 넣으면 기록이 어긋난다 (8/4) */}
                {!readOnlyDay && (
                  <button
                    onClick={() => setAddOpen((v) => !v)}
                    className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent"
                  >
                    <UserPlus size={12} /> 대기 수동 추가
                  </button>
                )}
              </div>

              {addOpen && (
                <form onSubmit={handleManualAdd} className="px-4 py-3 border-b border-border bg-secondary/40 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    이름
                    <input
                      required value={addForm.name}
                      onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-card w-28"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    전화번호
                    <input
                      required value={addForm.phone} placeholder="010-0000-0000"
                      onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-card w-32"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    이메일
                    <input
                      required type="email" value={addForm.email}
                      onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-card w-44"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    인원
                    <input
                      type="number" min={1} value={addForm.partySize}
                      onChange={(e) => setAddForm((p) => ({ ...p, partySize: Number(e.target.value) }))}
                      className="w-16 px-2 py-1.5 text-xs border border-border rounded-sm bg-card text-right"
                    />
                  </label>
                  <button type="submit" disabled={adding} className="text-xs px-4 py-2 rounded-sm bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-50">
                    {adding ? "추가 중…" : "추가"}
                  </button>
                </form>
              )}

              {loading ? (
                <div className="text-center text-xs text-muted-foreground py-10">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </div>
              ) : (
                <table className="w-full text-[13px] min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2.5">순번</th>
                      <th className="text-left font-medium px-4 py-2.5">등록 시각</th>
                      <th className="text-left font-medium px-4 py-2.5">이름</th>
                      <th className="text-left font-medium px-4 py-2.5">연락처</th>
                      <th className="text-right font-medium px-4 py-2.5">인원</th>
                      <th className="text-center font-medium px-4 py-2.5">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {walkinRows.map((row, i) => (
                      <tr key={row.key} className={row.status === "NO_SHOW" || row.status === "CANCELLED" ? "opacity-60" : row.status === "ENTERED" ? "bg-emerald-50/40" : "hover:bg-secondary/40"}>
                        <td className="px-4 py-2.5 font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>#{i + 1}</td>
                        {/* 입장 처리되면 서버가 joinedAt을 입장 시각으로 바꿔 보낸다 — 그때는 등록 시각 대신 "-" */}
                        <td className="px-4 py-2.5 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {row.status === "WAITING" && row.joinedAt
                            ? `${row.joinedAt.slice(5, 10)} ${fmtClock(row.joinedAt)}`
                            : "-"}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.contact}</td>
                        <td className="px-4 py-2.5 text-right">{row.partySize}명</td>
                        <td className="px-4 py-2.5">
                          <QueueActions row={row} actingKey={actingKey} readOnly={readOnlyDay} onEnter={handleEnter} onNoShow={handleNoShow} />
                        </td>
                      </tr>
                    ))}
                    {walkinRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                          {readOnlyDay ? `${dateLabel(day)}에 접수된 현장 웨이팅이 없습니다.` : "현재 현장 웨이팅이 없습니다. 현장 접수 웹 또는 수동 추가로 등록되면 여기 표시됩니다."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
                서버 통합 대기열(오늘은 30초 갱신) · 입장·노쇼 처리해도 명단에 남습니다 · 매일 자정 5분에 전날 미처리 건이 「미입장」으로 확정되고 대기열이 비워집니다
              </div>
            </div>
          )}

          {/* ── 하단: 현장 비치용 QR 2종 — 8/3 현장 접수 웹(checkin)으로 이관, 화면에서 내림 ── */}
          {SHOW_QR_TOOLS && mode !== "RESERVATION" && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-sm p-5 flex gap-4">
                <div className="border border-border rounded-sm p-2 bg-card shrink-0">
                  <QRCodeSVG value={CONSUMER_SIGNUP_URL} size={110} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                    <QrCode size={14} className="text-violet-500" /> 회원 웨이팅 QR
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    소비자 플랫폼 <span className="font-medium text-foreground">회원가입 페이지</span>로 연결됩니다.
                    가입(소셜 로그인) 후 팝업 상세페이지에서 현장 웨이팅을 등록하면 이 대기열에 순서대로 추가됩니다.
                  </p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-sm p-5 flex gap-4">
                <div className="border border-border rounded-sm p-2 bg-card shrink-0">
                  <QRCodeSVG value={`${window.location.origin}/walkin?popup=${selected.id}`} size={110} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                    <QrCode size={14} className="text-amber-500" /> 비회원 웨이팅 QR
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    이름·전화번호·이메일 입력 폼으로 연결됩니다. 제출하면 이 대기열에 자동 추가되고, 당일 대기번호와 입장 QR이 발급됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── QR 스캔 모달 (카메라) — SHOW_QR_TOOLS로 꺼 둠 (8/3) ── */}
      {SHOW_QR_TOOLS && scanOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setScanOpen(false)} />
          <div className="fixed inset-x-0 top-[10vh] mx-auto w-[min(420px,92vw)] bg-card border border-border rounded-sm shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Camera size={15} className="text-accent" /> 입장 QR 스캔
              </div>
              <button onClick={() => setScanOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            {!camError ? (
              <div className="relative rounded-sm overflow-hidden bg-black aspect-square">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/5 h-3/5 border-2 border-white/80 rounded-md" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-600">{camError}</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processQrValue(manualQr);
                    setManualQr("");
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={manualQr}
                    onChange={(e) => setManualQr(e.target.value)}
                    placeholder="QR 값 직접 입력"
                    className="flex-1 px-3 py-2 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  />
                  <button type="submit" className="text-xs px-3 py-2 rounded-sm bg-accent text-accent-foreground">처리</button>
                </form>
              </div>
            )}
            <div className="mt-3 min-h-[20px]">
              {qrMsg && (
                <p className={`text-xs ${qrMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{qrMsg.text}</p>
              )}
              {!qrMsg && !camError && (
                <p className="text-[11px] text-muted-foreground">QR을 프레임 안에 맞추면 자동으로 입장 처리됩니다.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
