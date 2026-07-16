import { useState } from "react";
import { Link } from "react-router";
import { Bell, Settings2 } from "lucide-react";
import { NOTIFICATIONS } from "../data";

const TYPE_COLOR: Record<string, string> = {
  웨이팅: "bg-accent/10 text-accent",
  예약: "bg-blue-50 text-blue-600",
  오픈: "bg-emerald-50 text-emerald-600",
  이벤트: "bg-amber-50 text-amber-600",
};

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS.map((n) => ({ ...n })));

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>알림</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))} className="text-xs text-muted-foreground">
            모두 읽음
          </button>
          <Link to="/my" className="text-muted-foreground"><Settings2 size={16} /></Link>
        </div>
      </div>

      <div className="flex flex-col">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
            className={`flex items-start gap-3 px-4 py-3.5 text-left border-b border-border ${n.unread ? "bg-accent/[0.03]" : ""}`}
          >
            <span className={`shrink-0 text-[10px] px-2 py-1 rounded-full font-medium ${TYPE_COLOR[n.type] ?? "bg-secondary text-muted-foreground"}`}>
              {n.type}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] leading-relaxed ${n.unread ? "font-medium" : "text-foreground/75"}`}>{n.text}</p>
              <div className="text-[11px] text-muted-foreground mt-1">{n.time}</div>
            </div>
            {n.unread && <span className="shrink-0 w-2 h-2 rounded-full bg-accent mt-1.5" />}
          </button>
        ))}
      </div>

      <div className="px-4 mt-6 flex flex-col items-center gap-2 text-center">
        <Bell size={20} className="text-muted-foreground/50" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          예약·웨이팅 알림은 항상 발송돼요.<br />관심 태그·광고 알림은 마이페이지 &gt; 알림 설정에서 관리할 수 있어요.
        </p>
      </div>
    </div>
  );
}
