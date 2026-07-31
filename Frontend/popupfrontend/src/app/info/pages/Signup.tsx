// 주최자 회원가입 페이지 (7/30 신설 — /login에서 URL 분리)
// 3단계 플로우(계정 정보 → 사업자 확인 → 주최자 상세)와 검증 로직은 기존 그대로.
// 카테고리는 7/29부터 하드코딩 대신 keyword 테이블(GET /api/keywords) 실데이터 — 컴포넌트에서 로드.
// 팝업등록 폼·소비자 관심 카테고리와 같은 마스터를 쓰므로 관리자가 마스터를 고치면 여기도 같이 바뀐다.
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowRight, ArrowLeft, CheckCircle, Building2, Check, X, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { signup as apiSignup, checkBusinessNumber, getKeywords, IdName } from "../../lib/api";
import {
  pageBg, panelCls, labelCls, inputDark, inputDarkSm, primaryBtn, mutedText, errorBox,
  formatBizNo, formatPhone, TermsModal, TrustBadges,
} from "./authShared";

type SignupStep = 1 | 2 | 3;

const STEP_LABELS = ["계정 정보", "사업자 확인", "주최자 상세"];

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<SignupStep>(1);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // 카테고리 마스터 로드 — 실패해도 가입 자체는 막지 않는다 (빈 목록이면 셀렉트에 안내만 표시)
  const [keywords, setKeywords] = useState<IdName[]>([]);
  useEffect(() => {
    getKeywords().then(setKeywords).catch(() => {});
  }, []);

  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", passwordConfirm: "", agree: false });

  // 2단계: 사업자등록번호 — 형식 확인 후 국세청 진위확인까지 이 단계에서 바로 수행 (7/29, #37)
  const [bizNo, setBizNo] = useState("");
  const [bizVerified, setBizVerified] = useState(false);
  const [bizChecking, setBizChecking] = useState(false);
  const [bizMessage, setBizMessage] = useState(""); // 서버가 내려준 진위확인 결과 문구

  // 3단계: 주최자 상세
  const [detail, setDetail] = useState({
    brandName: "", category: "", contactName: "", phone: "", website: "", expectedDate: "",
  });

  // 약관·개인정보처리방침 모달 (멘토 피드백: 가입 시 본문을 열람할 수 있어야 함)
  const [termsOpen, setTermsOpen] = useState(false);

  // 비밀번호 확인란과의 일치 여부 — 입력 중 실시간 표시용 (7/29)
  const pwMatch = signupForm.passwordConfirm.length > 0 ? signupForm.password === signupForm.passwordConfirm : null;

  // 1단계 → 2단계
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 이메일 형식 강제 — type="email"은 브라우저마다 느슨해서 명시 검증 추가 (7/29)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(signupForm.email.trim())) {
      setError("올바른 이메일 형식이 아닙니다. (예: hello@brand.com)");
      return;
    }
    if (signupForm.password !== signupForm.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!signupForm.agree) {
      setError("이용약관 및 개인정보처리방침에 동의해 주세요.");
      return;
    }
    setDetail((p) => ({ ...p, contactName: p.contactName || signupForm.name }));
    setStep(2);
  };

  // 2단계: 형식 확인 → 국세청 진위확인(상태조회)까지 즉시 수행 (7/29, #37).
  // 예전에는 형식만 보고 통과시킨 뒤 최종 가입 때 서버가 검증했는데, 그러면 3단계를 다 채우고
  // 제출한 뒤에야 반려돼 처음부터 다시 해야 했다. 최종 가입 시에도 서버가 같은 로직으로 재검증한다.
  const verifyBizNo = async () => {
    setError("");
    setBizMessage("");
    const digits = bizNo.replace(/[^0-9]/g, "");
    if (digits.length !== 10) {
      setError("사업자등록번호 10자리를 입력해 주세요. (예: 123-45-67890)");
      return;
    }
    setBizChecking(true);
    try {
      const { valid, message } = await checkBusinessNumber(bizNo);
      setBizMessage(message);
      if (valid) setBizVerified(true);
      else setError(message); // 미등록·폐업·조회불가 — 다음 단계로 못 가게 막고 사유를 그대로 보여준다
    } catch {
      // 7/31 정책 변경: 확인하지 못하면 막는다.
      // 그전에는 여기서 setBizVerified(true)를 했다 — "지금 확인 못 하니 통과시키고 최종 가입 때
      // 서버가 다시 본다"는 뜻이었는데, **서버도 같은 이유로 통과시키고 있었다.**
      // 실제로 국세청 API가 503으로 죽자 검증이 통째로 무력화돼 없는 번호로 가입이 됐다.
      setBizVerified(false);
      setError("지금은 국세청 사업자등록 상태조회에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBizChecking(false);
    }
  };

  // 3단계 → 가입 완료 (백엔드 회원가입 → 자동 로그인)
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 연락처: 백엔드 검증(^01[0-9]{8,9}$)과 동일 기준으로 먼저 확인 — 하이픈은 표시용이므로 제거
    const phoneDigits = detail.phone.replace(/[^0-9]/g, "");
    if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
      setError("연락처는 01로 시작하는 휴대폰 번호 10~11자리여야 합니다.");
      return;
    }
    setSubmitting(true);
    try {
      await apiSignup({
        email: signupForm.email,
        password: signupForm.password,
        companyName: detail.brandName,
        businessNumber: bizNo, // 000-00-00000 형식 (formatBizNo로 보장)
        phone: phoneDigits, // 백엔드는 숫자만 받음 (하이픈 없이)
        agreeTerms: signupForm.agree, // 개인정보 수집·이용 동의 (백엔드 필수 — 1단계에서 체크 검증됨)
      });
      await login(signupForm.email, signupForm.password);
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── 가입 완료 화면 ──
  if (completed) {
    return (
      <main className={`${pageBg} flex items-center justify-center py-16 px-6`}>
        <div className={`${panelCls} w-full max-w-md text-center p-10`}>
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold mb-3 text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
            주최자 가입 신청이 완료되었습니다
          </h1>
          <p className={`text-sm leading-relaxed mb-6 ${mutedText}`}>
            <strong className="text-foreground">{signupForm.email}</strong> 계정이 활성화되었습니다.<br />
            지금 바로 주최자센터에서 팝업을 등록할 수 있으며,<br />등록한 팝업은 관리자 심사 후 게시됩니다.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/")} className="text-sm border border-white/25 text-foreground px-5 py-2.5 rounded-sm hover:border-white transition-colors">
              홈으로 가기
            </button>
            <button onClick={() => navigate("/seller")} className={`${primaryBtn} px-5 py-2.5`}>
              주최자센터 둘러보기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageBg}>
      <div className="max-w-2xl mx-auto px-6 py-14 lg:py-20">
        {/* 페이지 제목 — 자간을 넓혀 폼과 위계를 벌린다 */}
        <h1 className="text-3xl font-extrabold tracking-[0.12em] mb-2 text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
          주최자 계정 만들기
        </h1>
        <p className={`text-sm mb-10 ${mutedText}`}>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-accent underline underline-offset-4 hover:brightness-125">
            로그인
          </Link>
        </p>

        {/* 회원가입 단계 표시 */}
        <div className="flex items-center mb-10">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as SignupStep;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border-2 ${
                      n < step
                        ? "bg-accent border-accent text-foreground"
                        : n === step
                          ? "border-accent text-accent bg-accent/10"
                          : "border-white/20 text-muted-foreground bg-transparent"
                    }`}
                  >
                    {n < step ? <Check size={13} /> : n}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${n === step ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${n < step ? "bg-accent" : "bg-white/15"}`} />}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && <div className={`${errorBox} mb-5`}>{error}</div>}

        {/* ── 1단계: 계정 정보 ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>이름 (담당자)</span>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="홍길동"
                required
                className={inputDark}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>이메일</span>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="hello@brand.com"
                required
                className={inputDark}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className={labelCls}>비밀번호</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="8자 이상"
                    required
                    minLength={8}
                    className={inputDark + " pr-9"}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelCls}>비밀번호 확인</span>
                <input
                  type={showPw ? "text" : "password"}
                  value={signupForm.passwordConfirm}
                  onChange={(e) => setSignupForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                  placeholder="재입력"
                  required
                  className={
                    inputDark +
                    (pwMatch === true ? " border-green-500 focus:border-green-500" : pwMatch === false ? " border-red-500/70" : "")
                  }
                />
              </label>
            </div>

            {/* 비밀번호 일치 실시간 표시 (7/29) — 확인란에 입력이 있을 때만 */}
            {pwMatch !== null && (
              <div className={`flex items-center gap-1.5 text-xs -mt-3 ${pwMatch ? "text-green-400" : "text-red-400"}`}>
                {pwMatch ? <Check size={13} /> : <X size={13} />}
                {pwMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
              </div>
            )}

            {/* Password strength hint */}
            {signupForm.password && (
              <div className="flex gap-1 items-center">
                {[8, 12, 16].map((len, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-colors ${signupForm.password.length >= len ? "bg-accent" : "bg-white/15"}`}
                  />
                ))}
                <span className={`text-xs ml-2 ${mutedText}`}>
                  {signupForm.password.length < 8 ? "약함" : signupForm.password.length < 12 ? "보통" : "강함"}
                </span>
              </div>
            )}

            {/* 약관 동의 — 1단계 마지막 */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={signupForm.agree}
                  onChange={(e) => setSignupForm((p) => ({ ...p, agree: e.target.checked }))}
                  className="mt-0.5 accent-[currentColor]"
                />
                <span className={`text-xs leading-relaxed ${mutedText}`}>
                  <span className="text-foreground font-medium">[필수]</span>{" "}
                  {/* 멘토 피드백: 동의 전에 본문을 열람할 수 있어야 함 → 클릭 시 모달로 전문 표시 */}
                  <button type="button" onClick={() => setTermsOpen(true)} className="underline underline-offset-2 text-foreground hover:text-accent">
                    이용약관 및 개인정보처리방침
                  </button>
                  에 동의합니다. 수집된 정보는 주최자 심사 및 서비스 제공 목적으로만 사용됩니다.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 accent-[currentColor]" />
                <span className={`text-xs ${mutedText}`}>[선택] 마케팅 정보 수신에 동의합니다.</span>
              </label>
            </div>

            <button type="submit" className={`${primaryBtn} w-full py-3.5 flex items-center justify-center gap-2`}>
              다음: 사업자 확인
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ── 2단계: 사업자등록번호 확인 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-sm bg-white/5 border border-white/10">
              <Building2 size={16} className="text-accent shrink-0 mt-0.5" />
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                팝온 주최자는 <span className="text-foreground font-medium">사업자 인증</span>이 필요합니다. 입력한 번호는 국세청 사업자등록 상태조회로 진위를 확인합니다.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className={labelCls}>사업자등록번호</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={bizNo}
                  onChange={(e) => { setBizNo(formatBizNo(e.target.value)); setBizVerified(false); setBizMessage(""); }}
                  placeholder="123-45-67890"
                  className={inputDark + " flex-1"}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  type="button"
                  onClick={verifyBizNo}
                  disabled={bizChecking}
                  className="shrink-0 px-4 text-sm rounded-sm border border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bizChecking && <Loader2 size={13} className="animate-spin" />}
                  {bizChecking ? "확인 중…" : "진위확인"}
                </button>
              </div>
            </label>

            {bizVerified && (
              <div className="rounded-sm border border-green-700/50 bg-green-900/25 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
                  <CheckCircle size={14} /> 사업자등록번호가 확인되었습니다
                </div>
                <p className="text-xs text-green-200/80 leading-relaxed">
                  {/* 국세청 응답을 그대로 보여준다 */}
                  {bizMessage || "국세청 사업자등록 상태조회를 통과했습니다."} 최종 가입 시 한 번 더 검증됩니다.
                </p>
              </div>
            )}

            {/* 확인 실패 — 버튼 바로 아래에서 붉게 알린다 (7/31).
                상단 에러 박스만으로는 「진위확인」을 누른 자리와 멀어서 실패를 놓치기 쉬웠다.
                미등록·폐업(사용자 잘못)과 조회불가(우리 잘못)를 구분해 문구를 다르게 쓴다. */}
            {!bizVerified && bizMessage && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/15 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <AlertTriangle size={14} /> 사업자등록번호를 확인하지 못했습니다
                </div>
                <p className="text-xs text-destructive/85 leading-relaxed">
                  {bizMessage} 확인되지 않으면 다음 단계로 넘어갈 수 없습니다.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border border-white/25 rounded-sm text-sm text-foreground hover:border-white transition-colors"
              >
                <ArrowLeft size={15} /> 이전
              </button>
              <button
                type="button"
                disabled={!bizVerified}
                onClick={() => { setStep(3); setError(""); }}
                className={`${primaryBtn} flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-40`}
              >
                다음: 주최자 상세
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── 3단계: 주최자 상세 ── */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className={labelCls}>브랜드명 *</span>
                <input
                  value={detail.brandName}
                  onChange={(e) => setDetail((p) => ({ ...p, brandName: e.target.value }))}
                  required
                  placeholder="예: MINU Studio"
                  className={inputDarkSm}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelCls}>카테고리 *</span>
                <select
                  value={detail.category}
                  onChange={(e) => setDetail((p) => ({ ...p, category: e.target.value }))}
                  required
                  className={inputDarkSm + " appearance-none"}
                >
                  <option value="" disabled>{keywords.length ? "카테고리 선택" : "카테고리 목록을 불러오는 중…"}</option>
                  {keywords.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className={labelCls}>담당자 성명 *</span>
                <input
                  value={detail.contactName}
                  onChange={(e) => setDetail((p) => ({ ...p, contactName: e.target.value }))}
                  required
                  placeholder="홍길동"
                  className={inputDarkSm}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelCls}>연락처 (휴대폰) *</span>
                <input
                  value={detail.phone}
                  onChange={(e) => setDetail((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  className={inputDarkSm}
                />
              </label>
            </div>

            {/* 7/29 기능 정리 — 브랜드 웹사이트·희망 팝업 시작일 칸 제거 (일단 주석 보존).
                웹사이트는 팝업등록의 SNS 링크로, 시작일은 팝업등록의 운영기간으로 대체됐다.
                (구 마크업은 URL 분리 전 Login.tsx 이력 참고 — git log info/pages/Login.tsx) */}

            <p className={`text-[11px] leading-relaxed ${mutedText}`}>
              가입 즉시 주최자센터 계정이 활성화됩니다. 등록하는 팝업은 게시 전 플랫폼 관리자의 건별 심사를 거칩니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(2); setError(""); }}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border border-white/25 rounded-sm text-sm text-foreground hover:border-white transition-colors"
              >
                <ArrowLeft size={15} /> 이전
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`${primaryBtn} flex-1 py-3.5 flex items-center justify-center gap-2`}
              >
                {submitting ? "가입 처리 중…" : "주최자 가입 완료"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        <TrustBadges />
      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </main>
  );
}
