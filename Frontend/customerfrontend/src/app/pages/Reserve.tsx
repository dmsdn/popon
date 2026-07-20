import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Minus, Plus, UserPlus, CheckCircle2, QrCode } from "lucide-react";
import { Popup, RESERVATION_HINT, CONGESTION_COLOR } from "../data";
import { useAuth } from "../context/AuthContext";
import { fetchPopup, toUiPopup, createReservation } from "../lib/api";

// 오늘부터 6일치 날짜 생성
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const DATES = Array.from({ length: 6 }, (_, i) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + i);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return { d: `${mm}.${dd}`, day: DAY_KO[dt.getDay()], iso: `${dt.getFullYear()}-${mm}-${dd}` };
});

export default function Reserve() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [popup, setPopup] = useState<Popup | null>(null);

  const [date, setDate] = useState(DATES[0].d);
  const [time, setTime] = useState<string | null>(null);
  const [count, setCount] = useState(2);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [invited, setInvited] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchPopup(id).then((p) => setPopup(toUiPopup(p))).catch(() => setPopup(null));
  }, [id]);

  const canSubmit = time !== null && agreePrivacy && agreePolicy && !submitting;

  const submit = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!time) return;
    setSubmitting(true);
    setError("");
    try {
      await createReservation({
        popupId: Number(id),
        visitDate: DATES.find((x) => x.d === date)!.iso,
        visitTime: time,
        partySize: count,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!popup) {
    return <div className="px-6 pt-20 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  }

  if (done) {
    return (
      <div className="px-6 pt-16 pb-10 flex flex-col items-center text-center">
        <CheckCircle2 size={44} className="text-emerald-500 mb-4" />
        <h1 className="text-lg font-semibold mb-1">예약이 확정되었어요!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {popup.name}<br />{date} ({DATES.find((x) => x.d === date)?.day}) {time} · {count}명
        </p>
        <div className="w-40 h-40 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground mb-6">
          <QrCode size={56} />
          <span className="text-[11px]">입장 QR 티켓</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-6">방문 하루 전과 순서 임박 시 {user?.provider === "google" ? "이메일" : "카카오톡"}으로 알림을 보내드려요.</p>
        <div className="flex gap-2 w-full">
          <button onClick={() => navigate("/reservations")} className="flex-1 text-sm py-3 rounded-lg border border-border font-medium">예약 관리</button>
          <button onClick={() => navigate("/")} className="flex-1 text-sm py-3 rounded-lg bg-accent text-white font-medium">홈으로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>방문 예약</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{popup.name} · {popup.location}</p>
      </div>

      {/* 날짜 선택 */}
      <section className="px-4 mb-5">
        <h2 className="text-sm font-semibold mb-2.5">날짜 선택</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {DATES.map(({ d, day }) => (
            <button key={d} onClick={() => setDate(d)}
              className={`shrink-0 w-14 py-2.5 rounded-lg border text-center transition-colors ${
                date === d ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground"
              }`}>
              <div className="text-[10px]">{day}</div>
              <div className="text-[13px] font-semibold">{d}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 시간 선택 */}
      <section className="px-4 mb-5">
        <h2 className="text-sm font-semibold mb-2.5">시간 선택</h2>
        <div className="grid grid-cols-4 gap-2">
          {RESERVATION_HINT.map((s) => (
            <button key={s.time} disabled={!s.available} onClick={() => setTime(s.time)}
              className={`py-2.5 rounded-lg border text-center transition-colors disabled:opacity-40 ${
                time === s.time ? "border-accent bg-accent/5 text-accent" : "border-border"
              }`}>
              <div className="text-[13px] font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>{s.time}</div>
              <div className={`mx-auto mt-1 w-fit text-[9px] px-1.5 py-px rounded-full border ${CONGESTION_COLOR[s.level]}`}>{s.level}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 인원 선택 */}
      <section className="px-4 mb-5">
        <h2 className="text-sm font-semibold mb-2.5">인원 선택</h2>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <span className="text-sm">방문 인원 <span className="text-[11px] text-muted-foreground">(최대 6명)</span></span>
          <div className="flex items-center gap-4">
            <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center"><Minus size={14} /></button>
            <span className="text-base font-semibold w-6 text-center">{count}</span>
            <button onClick={() => setCount(Math.min(6, count + 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center"><Plus size={14} /></button>
          </div>
        </div>
      </section>

      {/* 함께보기 */}
      <section className="px-4 mb-5">
        <button onClick={() => setInvited(true)}
          className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${invited ? "border-accent/40 bg-accent/5" : "border-border"}`}>
          <UserPlus size={17} className={invited ? "text-accent" : "text-muted-foreground"} />
          <div className="text-left flex-1">
            <div className="text-[13px] font-medium">{invited ? "초대 링크가 생성되었어요" : "함께 갈 친구 초대하기"}</div>
            <div className="text-[11px] text-muted-foreground">{invited ? "친구가 수락하면 예약 내역이 공유됩니다." : "예약 내역을 함께 보고 알림도 같이 받아요."}</div>
          </div>
        </button>
      </section>

      {/* 약관 동의 */}
      <section className="px-4 mb-6 flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold">약관 동의</h2>
        <label className="flex items-start gap-2.5 text-[13px] cursor-pointer">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5 accent-[#E85D3C]" />
          <span>[필수] 예약 서비스 제공을 위한 개인정보 수집·이용 동의</span>
        </label>
        <label className="flex items-start gap-2.5 text-[13px] cursor-pointer">
          <input type="checkbox" checked={agreePolicy} onChange={(e) => setAgreePolicy(e.target.checked)} className="mt-0.5 accent-[#E85D3C]" />
          <span>[필수] 노쇼·취소 정책 확인 (방문 24시간 전까지 변경/취소 가능)</span>
        </label>
      </section>

      <div className="px-4">
        {error && <p className="text-[11px] text-red-500 text-center mb-2">{error}</p>}
        <button disabled={!canSubmit} onClick={submit}
          className="w-full text-sm py-3.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40 hover:bg-accent/90">
          {submitting ? "예약 처리 중…" : time ? `${date} ${time} · ${count}명 예약하기` : "시간을 선택해 주세요"}
        </button>
        {!user && <p className="text-[11px] text-muted-foreground text-center mt-2">비회원 예약은 지원하지 않아요. 예약하기를 누르면 로그인 화면으로 이동해요.</p>}
      </div>
    </div>
  );
}
