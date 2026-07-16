import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Star, Camera, X, BadgeCheck, CheckCircle2 } from "lucide-react";
import { POPUPS } from "../data";

export default function ReviewWrite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const popup = POPUPS.find((p) => p.id === id) ?? POPUPS[0];

  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="px-6 pt-16 flex flex-col items-center text-center">
        <CheckCircle2 size={44} className="text-emerald-500 mb-4" />
        <h1 className="text-lg font-semibold mb-1">후기가 등록되었어요!</h1>
        <p className="text-sm text-muted-foreground mb-6">소중한 후기 감사해요. 리워드 쿠폰이 쿠폰함으로 지급됐어요.</p>
        <button onClick={() => navigate(`/popup/${popup.id}`)} className="text-sm px-6 py-3 rounded-lg bg-accent text-white font-medium">팝업으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-8 px-4 gap-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>후기 작성</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{popup.name}</p>
      </div>

      {/* 방문 인증 */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
        <BadgeCheck size={17} className="text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-700 leading-relaxed">
          <span className="font-semibold">방문 인증 완료</span> — 07.08 예약·입장 내역이 확인됐어요. 인증 배지가 후기에 표시돼요.
        </div>
      </div>

      {/* 별점 */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5">별점을 선택해 주세요</h2>
        <div className="flex gap-1.5 justify-center py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star size={34} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-border"} />
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {rating === 0 ? "별을 눌러 만족도를 알려주세요" : ["아쉬워요", "그저 그래요", "보통이에요", "좋아요!", "최고예요!"][rating - 1]}
        </p>
      </div>

      {/* 사진 첨부 */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5">사진 첨부 <span className="text-[11px] font-normal text-muted-foreground">(최대 5장)</span></h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => photos.length < 5 && setPhotos([...photos, `사진_${photos.length + 1}`])}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent"
          >
            <Camera size={18} />
            <span className="text-[10px]">{photos.length}/5</span>
          </button>
          {photos.map((p) => (
            <div key={p} className="relative w-20 h-20 rounded-lg bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
              {p}
              <button onClick={() => setPhotos(photos.filter((x) => x !== p))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 후기 본문 */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5">후기</h2>
        <textarea
          rows={6}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="방문 경험을 솔직하게 남겨주세요. 웨이팅 팁, 굿즈 후기, 포토존 정보는 다른 방문자에게 큰 도움이 돼요. (최소 10자)"
          className="w-full p-3.5 text-[13px] leading-relaxed bg-secondary rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="text-right text-[11px] text-muted-foreground mt-1">{text.length}/1,000</div>
      </div>

      <button
        disabled={rating === 0 || text.length < 10}
        onClick={() => setDone(true)}
        className="w-full text-sm py-3.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40"
      >
        후기 등록하기
      </button>
    </div>
  );
}
