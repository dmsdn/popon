import { useState } from "react";
import { Link } from "react-router";
import { Gift, Upload, Trophy, CheckCircle2, TicketPercent } from "lucide-react";
import { EVENTS } from "../data";

export default function Events() {
  const [joined, setJoined] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);

  const join = (id: string) => setJoined((prev) => [...prev, id]);
  const upload = (id: string) => setUploaded((prev) => [...prev, id]);

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>이벤트</h1>
        <p className="text-xs text-muted-foreground mt-0.5">참여하고 쿠폰·굿즈 리워드를 받아보세요.</p>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {EVENTS.map((e) => {
          const isJoined = joined.includes(e.id);
          const isUploaded = uploaded.includes(e.id);
          const ended = e.state === "당첨자 발표";

          return (
            <div key={e.id} className="rounded-xl border border-border overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ended ? "bg-blue-50 text-blue-600" : "bg-accent/10 text-accent"}`}>
                    {e.state}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{e.period}</span>
                </div>
                <h2 className="text-sm font-semibold mb-1">{e.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{e.desc}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-foreground/70">
                  <Gift size={12} className="text-accent" /> 리워드: {e.reward}
                </div>
              </div>

              <div className="px-4 pb-4">
                {ended ? (
                  <button className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-blue-200 text-blue-600 font-medium">
                    <Trophy size={13} /> 당첨자 발표 확인하기
                  </button>
                ) : !isJoined ? (
                  <button onClick={() => join(e.id)} className="w-full text-xs py-2.5 rounded-lg bg-accent text-white font-medium">
                    이벤트 참여하러 가기
                  </button>
                ) : !isUploaded ? (
                  <button onClick={() => upload(e.id)} className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-accent text-accent font-medium">
                    <Upload size={13} /> 참여 인증 이미지 업로드
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 font-medium">
                    <CheckCircle2 size={13} /> 참여 완료! 쿠폰이 쿠폰함으로 자동 지급됐어요
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 mt-5">
        <Link to="/my" className="flex items-center gap-2.5 p-3.5 rounded-lg bg-secondary/70 text-xs text-muted-foreground">
          <TicketPercent size={15} className="text-accent shrink-0" />
          받은 쿠폰은 <span className="font-medium text-foreground">마이페이지 &gt; 쿠폰함</span>에서 확인하세요.
        </Link>
      </div>
    </div>
  );
}
