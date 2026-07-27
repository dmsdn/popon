import { useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2 } from "lucide-react";
import { getMyPopups, Popup } from "../../lib/api";

const HISTORY = [
  { date: "07-13 08:20", title: "우천으로 야외 포토존 운영 중단 안내", target: "예약자 전체 (SNS·앱 푸시)", sent: 1240 },
  { date: "07-11 17:05", title: "금일 마감 1시간 연장 운영 안내", target: "당일 예약자", sent: 356 },
];

export default function Notices() {
  const [sent, setSent] = useState(false);
  // 7/24 멘토 피드백: 제목 자유 입력 대신 "어느 팝업에 대한 공지인지"를 팝업명으로 강제
  const [myPopups, setMyPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState("");
  useEffect(() => {
    getMyPopups()
      .then((all) => {
        // 공지를 보낼 수 있는 건 게시된 팝업(오픈예정·진행중)뿐 — 심사 대기·반려·종료는 제외
        const notifiable = all.filter((p) => p.status === "BEFOR" || p.status === "OPEN");
        setMyPopups(notifiable);
        setPopupId((prev) => prev || (notifiable[0] ? String(notifiable[0].id) : ""));
      })
      .catch(() => setMyPopups([]));
  }, []);
  const inputCls = "w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">긴급공지 발송</h1>
        <p className="text-xs text-muted-foreground mt-0.5">기상악화·운영 변경 등 내 팝업 관련 긴급 공지를 SNS/앱 푸시로 즉시 발송합니다.</p>
      </div>

      <div className="bg-white border border-border rounded-sm p-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5">발송 대상 *</label>
          <div className="flex flex-wrap gap-2">
            {["예약자 전체", "당일 예약자", "웨이팅 등록자", "팝업 찜한 소비자"].map((t, i) => (
              <label key={t} className="flex items-center gap-1.5 text-[13px] border border-border rounded-sm px-3 py-2 cursor-pointer has-[:checked]:border-accent has-[:checked]:text-accent has-[:checked]:bg-accent/5">
                <input type="checkbox" defaultChecked={i === 0} className="accent-[#E85D3C]" /> {t}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">공지 대상 팝업 *</label>
          {/* 제목 자유 입력 제거 — 공지 제목은 선택한 팝업명으로 자동 지정 (7/24 멘토 피드백) */}
          <select className={inputCls} value={popupId} onChange={(e) => setPopupId(e.target.value)}>
            {myPopups.length === 0 && <option value="">공지를 보낼 수 있는 게시중 팝업이 없습니다</option>}
            {myPopups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">공지 제목은 「[긴급공지] 팝업명」 형식으로 자동 발송됩니다.</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">공지 내용 *</label>
          <textarea rows={5} className={inputCls + " resize-y leading-relaxed"} placeholder="발송 후에는 수정할 수 없습니다. 내용을 정확히 확인해 주세요." />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground"></p>
          {sent ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 size={14} /> 발송 완료</span>
          ) : (
            <button
              onClick={() => setSent(true)}
              disabled={!popupId}
              className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} /> 즉시 발송
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
          <Megaphone size={14} className="text-muted-foreground" /> 발송 이력
        </div>
        <ul className="divide-y divide-border">
          {HISTORY.map((h) => (
            <li key={h.date} className="px-4 py-3 flex items-center gap-4">
              <span className="shrink-0 text-[11px] text-muted-foreground w-24" style={{ fontFamily: "'DM Mono', monospace" }}>{h.date}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{h.title}</div>
                <div className="text-[11px] text-muted-foreground">{h.target}</div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{h.sent.toLocaleString()}명 수신</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
