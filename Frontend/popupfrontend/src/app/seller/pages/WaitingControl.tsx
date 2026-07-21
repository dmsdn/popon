import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { Loader2, LogOut, QrCode, UserPlus, CheckCircle2, XCircle, Info, Clock3, X, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyPopups, getSlots, getPopupReservations, checkinReservation, markNoShow, checkinByQr,
  Popup, PopupSlot, ReservationDetail,
} from "../../lib/api";
import {
  loadWalkins, addWalkin, updateWalkin, loadOpsMode, loadResExits, markResExit, localNowIso,
  WalkinEntry, OpsMode,
} from "../../lib/walkinQueue";

// 대기열·인원 관제 — 예약·웨이팅 통합관리
// 실연동: 사전예약 명단·슬롯(조회), 입장 체크인·노쇼(PATCH, 서버가 처리 시각 기록)
// 로컬(백엔드 구성 후 연동): 현장 웨이팅 접수(회원/비회원)·운영 모드·퇴장 처리·입장 QR 메일/SMS 발송

const CONSUMER_URL = "http://localhost:5173"; // 소비자 플랫폼 (회원가입·소셜로그인 → 상세페이지 웨이팅)
const NOSHOW_GRACE_MS = 5 * 60 * 1000; // 슬롯 종료 +5분 안에 미입장 → 노쇼 처리 대상

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : "");
const fmtClock = (iso: string | null | undefined) => (iso ? iso.slice(11, 16) : "");

const MODE_LABEL: Record<OpsMode, string> = {
  RESERVATION: "사전예약만",
  WALKIN: "현장 웨이팅만",
  BOTH: "둘 다 운영",
};

const TYPE_BADGE: Record<string, [string, string]> = {
  RESERVATION: ["사전예약", "bg-blue-50 text-blue-600 border-blue-200"],
  MEMBER: ["현장·회원", "bg-violet-50 text-violet-600 border-violet-200"],
  GUEST: ["현장·비회원", "bg-amber-50 text-amber-700 border-amber-200"],
};

// 대기열 통합 행 — 사전예약(서버)과 현장 웨이팅(로컬)을 한 표로
type QueueRow = {
  key: string;
  kind: "RESERVATION" | "WALKIN";
  resId?: number;
  walkinId?: string;
  typeKey: string; // TYPE_BADGE 키
  name: string;
  contact: string;
  partySize: number;
  slotId: number | null;
  registeredAt: string;
  enteredAt: string | null;
  noShow: boolean;
  exitedAt: string | null;
};

export default function WaitingControl() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [roster, setRoster] = useState<ReservationDetail[]>([]);
  const [walkins, setWalkins] = useState<WalkinEntry[]>([]);
  const [resExits, setResExits] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<OpsMode>("BOTH");
  const [slotFilter, setSlotFilter] = useState<number | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // 수동 추가 폼 (현장 직원용)
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", partySize: 1, type: "GUEST" as "MEMBER" | "GUEST", phone: "" });

  // ── QR 카메라 스캔 입장 — 「QR코드 읽기」 버튼 → 카메라 스캔 → 즉시 입장 처리 ──
  const [scanOpen, setScanOpen] = useState(false);
  const [camError, setCamError] = useState("");
  const [qrMsg, setQrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualQr, setManualQr] = useState(""); // 카메라 불가 시 폴백 입력
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanRef = useRef<{ v: string; t: number }>({ v: "", t: 0 });

  const processQrValue = async (raw: string) => {
    const v = raw.trim();
    if (!v || !popupId) return;
    try {
      if (v.startsWith("popupon-entry:")) {
        // 현장 웨이팅(로컬) 입장 QR: popupon-entry:{popupId}:{entryId}
        const [, , entryId] = v.split(":");
        const target = loadWalkins(popupId).find((w) => w.id === entryId);
        if (!target) throw new Error("이 팝업의 대기열에서 QR을 찾을 수 없습니다.");
        if (target.enteredAt) throw new Error(`${target.name}님은 이미 입장 처리되었습니다.`);
        setWalkins(updateWalkin(popupId, entryId, { enteredAt: localNowIso() }));
        setQrMsg({ ok: true, text: `${target.name}님 입장 처리 완료` });
      } else {
        // 사전예약 입장 QR(qrToken) — 백엔드 실연동, 서버가 입장 시각 기록
        const updated = await checkinByQr(v);
        setRoster((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setQrMsg({ ok: true, text: `${updated.customerNickname}님(사전예약) 입장 처리 완료` });
      }
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

  useEffect(() => {
    if (!isBusiness) return;
    getMyPopups()
      .then((list) => {
        setPopups(list);
        if (list.length > 0) setPopupId((prev) => prev ?? list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."));
  }, [isBusiness]);

  // 서버 데이터 로드 + 30초마다 갱신 (자동 편입·QR 접수 반영)
  useEffect(() => {
    if (!popupId) return;
    let alive = true;
    const fetchAll = (withSpinner: boolean) => {
      if (withSpinner) setLoading(true);
      Promise.all([getSlots(popupId), getPopupReservations(popupId)])
        .then(([s, r]) => {
          if (!alive) return;
          setSlots(s);
          setRoster(r);
          setError("");
        })
        .catch((e) => alive && setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
        .finally(() => alive && withSpinner && setLoading(false));
      setWalkins(loadWalkins(popupId));
      setResExits(loadResExits(popupId));
      setNowMs(Date.now());
    };
    fetchAll(true);
    // 운영 방식은 팝업 등록/수정에서 확정 — 여기서는 표시만 (FREE 팝업은 현장 웨이팅만)
    const p = popups.find((x) => x.id === popupId);
    setMode(p?.reservationMode === "FREE" ? "WALKIN" : loadOpsMode(popupId));
    setSlotFilter("ALL");
    const t = setInterval(() => fetchAll(false), 30_000);
    // 같은 브라우저 다른 탭(비회원 폼)에서 접수하면 즉시 반영
    const onStorage = (e: StorageEvent) => {
      if (e.key === `walkinQueue:${popupId}`) setWalkins(loadWalkins(popupId));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [popupId]);

  const selected = popups.find((p) => p.id === popupId) ?? null;
  const slotMap = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots]);

  // 예약의 시작·종료 시각 (슬롯 예약이면 슬롯 기준, FREE 예약이면 자체 시간 기준)
  const resStart = (r: ReservationDetail): Date | null => {
    if (r.slotId && slotMap[r.slotId]) {
      const s = slotMap[r.slotId];
      return new Date(`${s.slotDate}T${s.startTime}`);
    }
    if (r.startTime) return new Date(`${r.reservationDate}T${r.startTime}`);
    return r.reservationDate ? new Date(`${r.reservationDate}T00:00:00`) : null;
  };
  const rowEnd = (slotId: number | null): Date | null => {
    if (slotId && slotMap[slotId]) {
      const s = slotMap[slotId];
      return new Date(`${s.slotDate}T${s.endTime}`);
    }
    return null;
  };

  // ── 현장 대기열 구성: 슬롯 시작된 사전예약(취소 제외) 먼저, 그 아래 현장 웨이팅 접수순 ──
  const queueRows = useMemo<QueueRow[]>(() => {
    const now = new Date(nowMs);
    const resRows: QueueRow[] =
      mode === "WALKIN"
        ? []
        : roster
            .filter((r) => r.status !== "CANCELLED") // 예약취소자는 대기열로 편입되지 않음
            .filter((r) => {
              const st = resStart(r);
              return st !== null && st <= now; // 슬롯 시작 시간이 되면 자동 편입
            })
            .map((r) => ({
              key: `res-${r.id}`,
              kind: "RESERVATION" as const,
              resId: r.id,
              typeKey: "RESERVATION",
              name: r.customerNickname,
              contact: "-",
              partySize: r.partySize,
              slotId: r.slotId,
              registeredAt: r.createdAt,
              enteredAt: r.entryStatus === "CHECKED_IN" ? r.checkedInAt : null,
              noShow: r.entryStatus === "NO_SHOW",
              exitedAt: resExits[String(r.id)] ?? null,
            }))
            .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    const walkinRows: QueueRow[] =
      mode === "RESERVATION"
        ? []
        : walkins
            .map((w) => ({
              key: `walkin-${w.id}`,
              kind: "WALKIN" as const,
              walkinId: w.id,
              typeKey: w.type,
              name: w.name,
              contact: w.phone || w.email || "-",
              partySize: w.partySize,
              slotId: w.slotId,
              registeredAt: w.createdAt,
              enteredAt: w.enteredAt ?? null,
              noShow: !!w.noShowAt,
              exitedAt: w.exitedAt ?? null,
            }))
            .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    return [...resRows, ...walkinRows]; // 사전예약자 밑에 현장 웨이팅 순서대로
  }, [roster, walkins, resExits, slotMap, nowMs, mode]);

  const filteredRows = queueRows.filter((row) => slotFilter === "ALL" || row.slotId === slotFilter);

  // 노쇼 버튼 노출: 슬롯 종료 +5분까지 입장 처리되지 않은 사람 (슬롯 미지정은 직원 재량으로 항상)
  const noShowReady = (row: QueueRow) => {
    const end = rowEnd(row.slotId);
    return end === null || nowMs > end.getTime() + NOSHOW_GRACE_MS;
  };

  // 혼잡도 정원 = 팝업 등록의 「최대 수용 정원」(동시 체류 기준) — 슬롯 정원 합산 아님
  // ── 체류 인원: 입장 처리됐고 아직 퇴장 안 한 사람 (대기열 편입 여부와 무관하게 명단 전체 기준) ──
  const staying = useMemo<QueueRow[]>(() => {
    const resStaying: QueueRow[] = roster
      .filter((r) => r.entryStatus === "CHECKED_IN" && !resExits[String(r.id)])
      .map((r) => ({
        key: `res-${r.id}`,
        kind: "RESERVATION" as const,
        resId: r.id,
        typeKey: "RESERVATION",
        name: r.customerNickname,
        contact: "-",
        partySize: r.partySize,
        slotId: r.slotId,
        registeredAt: r.createdAt,
        enteredAt: r.checkedInAt,
        noShow: false,
        exitedAt: null,
      }));
    const walkinStaying: QueueRow[] = walkins
      .filter((w) => w.enteredAt && !w.exitedAt)
      .map((w) => ({
        key: `walkin-${w.id}`,
        kind: "WALKIN" as const,
        walkinId: w.id,
        typeKey: w.type,
        name: w.name,
        contact: w.phone || w.email || "-",
        partySize: w.partySize,
        slotId: w.slotId,
        registeredAt: w.createdAt,
        enteredAt: w.enteredAt ?? null,
        noShow: false,
        exitedAt: null,
      }));
    return [...resStaying, ...walkinStaying].sort((a, b) => (a.enteredAt ?? "").localeCompare(b.enteredAt ?? ""));
  }, [roster, walkins, resExits]);
  const stayingCount = staying.reduce((a, r) => a + r.partySize, 0);
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
      .map((s) => ({
        slot: s,
        count: roster.filter((r) => r.slotId === s.id && r.status !== "CANCELLED").length,
      }))
      .filter((x) => x.count > 0);
  }, [slots, roster, nowMs]);

  // ── 처리 핸들러 ──
  const handleEnter = async (row: QueueRow) => {
    setActingKey(row.key);
    try {
      if (row.kind === "RESERVATION" && row.resId) {
        const updated = await checkinReservation(row.resId); // 서버가 입장 시각(checkedInAt) 기록
        setRoster((prev) => prev.map((x) => (x.id === row.resId ? updated : x)));
      } else if (row.walkinId && popupId) {
        setWalkins(updateWalkin(popupId, row.walkinId, { enteredAt: localNowIso() }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "입장 처리에 실패했습니다.");
    } finally {
      setActingKey(null);
    }
  };

  const handleNoShow = async (row: QueueRow) => {
    if (!window.confirm(`${row.name}님을 노쇼로 처리할까요?`)) return;
    setActingKey(row.key);
    try {
      if (row.kind === "RESERVATION" && row.resId) {
        const updated = await markNoShow(row.resId);
        setRoster((prev) => prev.map((x) => (x.id === row.resId ? updated : x)));
      } else if (row.walkinId && popupId) {
        setWalkins(updateWalkin(popupId, row.walkinId, { noShowAt: localNowIso() }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "노쇼 처리에 실패했습니다.");
    } finally {
      setActingKey(null);
    }
  };

  const handleExit = (row: QueueRow) => {
    if (!popupId) return;
    if (row.kind === "RESERVATION" && row.resId) {
      markResExit(popupId, row.resId);
      setResExits(loadResExits(popupId));
    } else if (row.walkinId) {
      setWalkins(updateWalkin(popupId, row.walkinId, { exitedAt: localNowIso() }));
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupId) return;
    // 현재 진행 중인 슬롯이 있으면 자동 귀속
    const now = new Date();
    const cur = slots.find((s) => new Date(`${s.slotDate}T${s.startTime}`) <= now && now <= new Date(`${s.slotDate}T${s.endTime}`));
    addWalkin(popupId, {
      slotId: cur?.id ?? null,
      type: addForm.type,
      name: addForm.name.trim(),
      phone: addForm.phone.trim() || undefined,
      partySize: addForm.partySize,
    });
    setWalkins(loadWalkins(popupId));
    setAddForm({ name: "", partySize: 1, type: "GUEST", phone: "" });
    setAddOpen(false);
  };

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
      <div className="flex flex-wrap items-end justify-between gap-3">
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
            className="px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
          >
            {popups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          사전예약 명단·입장 체크인·노쇼는 <strong>백엔드 실연동</strong>.
          현장 웨이팅 접수(QR)·운영 모드·퇴장 처리·입장 QR 메일/SMS 발송은 <strong>백엔드 구성 후 연동</strong>(현재 이 브라우저에 저장되는 데모).
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {popups.length === 0 && !error && (
        <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. <Link to="/seller/popups/new" className="text-accent underline underline-offset-2">팝업을 먼저 등록</Link>해 주세요.
        </div>
      )}

      {selected && (
        <>
          {/* ── 운영 방식 (팝업 등록/수정에서 확정 — 여기서는 표시만) ── */}
          <div className="bg-white border border-border rounded-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">운영 방식</span>
              <div className="flex gap-1">
                {(["RESERVATION", "WALKIN", "BOTH"] as OpsMode[]).map((m) => (
                  <span
                    key={m}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      mode === m ? "bg-foreground text-white border-foreground font-medium" : "border-border text-muted-foreground/50"
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
            <div className="bg-white border border-border rounded-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">현재 체류 인원 (혼잡도)</span>
                {level && <span className={`text-sm font-bold ${levelColor}`}>{level}</span>}
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-semibold">{stayingCount}</span>
                <span className="text-sm text-muted-foreground mb-1">
                  {capacity ? `/ 정원 ${capacity}명 (${rate}%)` : "명 (슬롯 정원 미설정)"}
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

            <div className="bg-white border border-border rounded-sm p-5 flex flex-col">
              <div className="text-sm font-semibold mb-3">대기 현황</div>
              <div className="text-3xl font-semibold">
                {filteredRows.filter((r) => !r.enteredAt && !r.noShow).length}
                <span className="text-sm font-normal text-muted-foreground ml-1">팀</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                총 {filteredRows.filter((r) => !r.enteredAt && !r.noShow).reduce((a, r) => a + r.partySize, 0)}명 대기 중
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

          {/* ── QR 입장 처리: 카메라 스캔 ── */}
          <div className="bg-white border border-border rounded-sm p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <QrCode size={15} className="text-accent" /> QR 입장 처리
            </div>
            <button
              onClick={() => setScanOpen(true)}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90"
            >
              <Camera size={13} /> QR코드 읽기
            </button>
            <span className="text-[11px] text-muted-foreground">
              대기자의 입장 QR을 카메라로 스캔하면 즉시 입장 처리되고 처리 열에 시각이 기록됩니다
            </span>
            {qrMsg && !scanOpen && (
              <span className={`w-full text-xs ${qrMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{qrMsg.text}</span>
            )}
          </div>

          {/* ── 현장 대기열 (슬롯별 보기) ── */}
          <div className="bg-white border border-border rounded-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-2">현장 대기열</span>
              {/* 자동 생성된 전체 예약 슬롯 반영 — 슬롯별로 선택해서 보기 */}
              <select
                value={slotFilter === "ALL" ? "ALL" : String(slotFilter)}
                onChange={(e) => setSlotFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                className="text-[12px] px-2.5 py-1.5 border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                <option value="ALL">전체 슬롯</option>
                {[...slots]
                  .sort((a, b) => `${a.slotDate}${a.startTime}`.localeCompare(`${b.slotDate}${b.startTime}`))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.slotDate.slice(5)} {fmtTime(s.startTime)}~{fmtTime(s.endTime)}
                    </option>
                  ))}
              </select>
              {mode !== "RESERVATION" && (
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
                    className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white w-32"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  인원
                  <input
                    type="number" min={1} value={addForm.partySize}
                    onChange={(e) => setAddForm((p) => ({ ...p, partySize: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 text-xs border border-border rounded-sm bg-white text-right"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  유형
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value as "MEMBER" | "GUEST" }))}
                    className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white"
                  >
                    <option value="GUEST">비회원</option>
                    <option value="MEMBER">회원</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  연락처 (선택)
                  <input
                    value={addForm.phone}
                    onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white w-36"
                  />
                </label>
                <button type="submit" className="text-xs px-4 py-2 rounded-sm bg-foreground text-white hover:bg-foreground/90">추가</button>
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
                    <th className="text-left font-medium px-4 py-2.5">유형</th>
                    <th className="text-left font-medium px-4 py-2.5">이름</th>
                    <th className="text-left font-medium px-4 py-2.5">연락처</th>
                    <th className="text-right font-medium px-4 py-2.5">인원</th>
                    <th className="text-left font-medium px-4 py-2.5">슬롯</th>
                    <th className="text-center font-medium px-4 py-2.5">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row, i) => {
                    const [typeLabel, typeCls] = TYPE_BADGE[row.typeKey] ?? TYPE_BADGE.GUEST;
                    const slot = row.slotId ? slotMap[row.slotId] : null;
                    return (
                      <tr key={row.key} className={row.noShow ? "opacity-50" : row.enteredAt ? "bg-emerald-50/40" : "hover:bg-secondary/40"}>
                        <td className="px-4 py-2.5 font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>#{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${typeCls}`}>{typeLabel}</span>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.contact}</td>
                        <td className="px-4 py-2.5 text-right">{row.partySize}명</td>
                        <td className="px-4 py-2.5 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {slot ? `${fmtTime(slot.startTime)}~${fmtTime(slot.endTime)}` : "미지정"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.noShow ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">노쇼</span>
                            ) : row.enteredAt ? (
                              // QR 입장 처리 시 입장 버튼 자리에 처리 시각 표기
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
                                <CheckCircle2 size={10} /> 입장 {fmtClock(row.enteredAt)}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEnter(row)}
                                  disabled={actingKey === row.key}
                                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                                >
                                  <CheckCircle2 size={11} /> 입장
                                </button>
                                {noShowReady(row) && (
                                  <button
                                    onClick={() => handleNoShow(row)}
                                    disabled={actingKey === row.key}
                                    title="슬롯 종료 +5분까지 미입장"
                                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                                  >
                                    <XCircle size={11} /> 노쇼
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                        현재 대기열이 비어 있습니다.
                        {mode !== "WALKIN" && " 슬롯 시작 시간이 되면 사전예약자가 자동 편입됩니다."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
              입장 처리 시 처리 열에 시각이 기록됩니다 · 슬롯 종료 +5분까지 미입장 시 노쇼 버튼이 나타납니다 · 예약취소자는 편입되지 않습니다
            </div>
          </div>

          {/* ── 하단: 현장 비치용 QR 2종 ── */}
          {mode !== "RESERVATION" && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-white border border-border rounded-sm p-5 flex gap-4">
                <div className="border border-border rounded-sm p-2 bg-white shrink-0">
                  <QRCodeSVG value={CONSUMER_URL} size={110} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                    <QrCode size={14} className="text-violet-500" /> 회원 웨이팅 QR
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    소비자 플랫폼으로 연결됩니다. 소셜 로그인(회원가입) 후 팝업 상세페이지에서
                    현장 웨이팅을 등록하면 이 대기열에 순서대로 추가되고, 웹에서 바로 입장 QR을 받습니다.
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    상세페이지 웨이팅 버튼은 소비자 프론트(백엔드 API 포함) 구현 후 연동
                  </p>
                </div>
              </div>
              <div className="bg-white border border-border rounded-sm p-5 flex gap-4">
                <div className="border border-border rounded-sm p-2 bg-white shrink-0">
                  <QRCodeSVG value={`${window.location.origin}/walkin?popup=${selected.id}`} size={110} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                    <QrCode size={14} className="text-amber-500" /> 비회원 웨이팅 QR
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    이름·전화번호·이메일 입력 폼으로 연결됩니다. 제출하면 이 대기열에 자동 추가되고,
                    입장 QR이 전화번호·이메일로 발송됩니다.
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    메일·SMS 발송은 백엔드 구성 후 연동 (현재는 접수 완료 화면에 QR 표시)
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── QR 스캔 모달 (카메라) ── */}
      {scanOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setScanOpen(false)} />
          <div className="fixed inset-x-0 top-[10vh] mx-auto w-[min(420px,92vw)] bg-white border border-border rounded-sm shadow-xl z-50 p-4">
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
                {/* 스캔 가이드 프레임 */}
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
                  <button type="submit" className="text-xs px-3 py-2 rounded-sm bg-accent text-white">처리</button>
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
