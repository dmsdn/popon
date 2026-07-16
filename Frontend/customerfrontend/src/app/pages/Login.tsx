import { useState } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../data";

type Provider = "kakao" | "google";
type Step = "login" | "terms" | "survey";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [provider, setProvider] = useState<Provider>("kakao");
  const [terms, setTerms] = useState({ service: false, privacy: false, location: false, marketing: false });
  const [interests, setInterests] = useState<string[]>([]);

  const requiredOk = terms.service && terms.privacy && terms.location;
  const allChecked = Object.values(terms).every(Boolean);

  const pick = (p: Provider) => { setProvider(p); setStep("terms"); };
  const finish = () => { login(provider, interests); navigate("/"); };

  return (
    <div className="px-6 pt-10 pb-8 flex flex-col">
      {step === "login" && (
        <>
          <div className="text-center mb-10">
            <div className="w-12 h-12 rounded-lg bg-accent mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-base font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
            </div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>팝업온에 오신 걸 환영해요</h1>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              3초 만에 가입하고 지금 뜨는 팝업을<br />예약·웨이팅 없이 즐겨보세요.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button onClick={() => pick("kakao")}
              className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#FEE500] text-[#191919] text-sm font-medium">
              <MessageCircle size={16} className="fill-[#191919]" /> 카카오로 3초 만에 시작하기
            </button>
            <button onClick={() => pick("google")}
              className="flex items-center justify-center gap-2 py-3.5 rounded-lg border border-border text-sm font-medium bg-background">
              <span className="text-base font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>G</span> Google로 계속하기
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
            카카오 로그인 시 카카오톡으로, 구글 로그인 시 이메일로<br />예약·웨이팅 알림을 받아볼 수 있어요. 자동 로그인이 유지돼요.
          </p>
        </>
      )}

      {step === "terms" && (
        <>
          <h1 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Noto Serif KR', serif" }}>약관에 동의해 주세요</h1>
          <p className="text-xs text-muted-foreground mb-6">위치 기반 팝업 추천을 위해 위치정보 동의가 필요해요.</p>

          <button
            onClick={() => setTerms({ service: !allChecked, privacy: !allChecked, location: !allChecked, marketing: !allChecked })}
            className={`flex items-center gap-3 p-4 rounded-lg border mb-3 ${allChecked ? "border-accent bg-accent/5" : "border-border"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${allChecked ? "bg-accent text-white" : "border border-border"}`}><Check size={12} /></span>
            <span className="text-sm font-semibold">전체 동의</span>
          </button>

          <div className="flex flex-col gap-3 px-1 mb-8">
            {([
              ["service", "[필수] 서비스 이용약관"],
              ["privacy", "[필수] 개인정보 수집·이용 동의"],
              ["location", "[필수] 위치기반 서비스 이용 동의"],
              ["marketing", "[선택] 이벤트·혜택 알림 수신"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-[13px] cursor-pointer">
                <input type="checkbox" checked={terms[k]} onChange={(e) => setTerms({ ...terms, [k]: e.target.checked })} className="accent-[#E85D3C] w-4 h-4" />
                <span className="flex-1">{label}</span>
                <span className="text-[11px] text-muted-foreground underline underline-offset-2">보기</span>
              </label>
            ))}
          </div>

          <button disabled={!requiredOk} onClick={() => setStep("survey")}
            className="w-full text-sm py-3.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40">
            동의하고 계속하기
          </button>
        </>
      )}

      {step === "survey" && (
        <>
          <h1 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Noto Serif KR', serif" }}>어떤 팝업을 좋아하세요?</h1>
          <p className="text-xs text-muted-foreground mb-6">관심 카테고리를 알려주시면 딱 맞는 팝업을 추천해 드려요. (선택)</p>

          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {CATEGORIES.map((c) => {
              const on = interests.includes(c);
              return (
                <button key={c}
                  onClick={() => setInterests((prev) => on ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`py-4 rounded-lg border text-sm font-medium transition-colors ${
                    on ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground"
                  }`}>
                  {c}
                </button>
              );
            })}
          </div>

          <button onClick={finish} className="w-full text-sm py-3.5 rounded-lg bg-accent text-white font-medium">
            {interests.length > 0 ? `${interests.length}개 선택하고 시작하기` : "건너뛰고 시작하기"}
          </button>
        </>
      )}
    </div>
  );
}
