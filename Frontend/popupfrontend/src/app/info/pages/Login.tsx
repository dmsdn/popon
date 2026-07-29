import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, Building2, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { signup as apiSignup, businessReconsent, getTerms, checkBusinessNumber, getKeywords, IdName, Terms } from "../../lib/api";

type Tab = "login" | "signup";
type SignupStep = 1 | 2 | 3;

// 카테고리는 7/29부터 하드코딩 대신 keyword 테이블(GET /api/keywords) 실데이터 — 컴포넌트에서 로드.
// 팝업등록 폼·소비자 관심 카테고리와 같은 마스터를 쓰므로 관리자가 마스터를 고치면 여기도 같이 바뀐다.

const STEP_LABELS = ["계정 정보", "사업자 확인", "주최자 상세"];

const inputCls =
  "w-full px-3 py-3 text-sm rounded-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent placeholder:text-muted-foreground/50";
const smallInputCls =
  "w-full px-3 py-2.5 text-sm rounded-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent placeholder:text-muted-foreground/50";

export default function Login() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab })?.tab ?? "login";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [step, setStep] = useState<SignupStep>(1);

  // 상단바 「로그인」을 눌렀는데 이미 /login에 있으면 URL이 같아 리렌더만 되고 탭이 안 바뀌던 버그 (7/29).
  // 헤더는 navigate("/login", { state: { tab } })로 의도를 실어 보내고, 여기서 state 변화를 감지해 탭을 맞춘다.
  // location.key는 같은 경로로 navigate해도 매번 바뀌므로 재클릭도 잡힌다.
  useEffect(() => {
    const wanted = (location.state as { tab?: Tab })?.tab;
    if (wanted) {
      setTab(wanted);
      setError("");
      if (wanted === "login") setStep(1); // 회원가입 진행 중이었다면 단계도 처음으로
    }
  }, [location.key, location.state]);

  // 카테고리 마스터 로드 — 실패해도 가입 자체는 막지 않는다 (빈 목록이면 셀렉트에 안내만 표시)
  const [keywords, setKeywords] = useState<IdName[]>([]);
  useEffect(() => {
    getKeywords().then(setKeywords).catch(() => {});
  }, []);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", passwordConfirm: "", agree: false });

  // 2단계: 사업자등록번호 — 형식 확인 후 국세청 진위확인까지 이 단계에서 바로 수행 (7/29, #37)
  const [bizNo, setBizNo] = useState("");
  const [bizVerified, setBizVerified] = useState(false);
  const [bizChecking, setBizChecking] = useState(false);
  const [bizMessage, setBizMessage] = useState(""); // 서버가 내려준 진위확인 결과 문구

  // 3단계: 주최자 상세 (기존 주최자 등록 신청서의 브랜드명 ~ 희망 팝업 시작일)
  const [detail, setDetail] = useState({
    brandName: "", category: "", contactName: "", phone: "", website: "", expectedDate: "",
  });

  // 약관·개인정보처리방침 모달 (멘토 피드백: 가입 시 본문을 열람할 수 있어야 함)
  const [termsOpen, setTermsOpen] = useState(false);
  const [terms, setTerms] = useState<Terms | null>(null);
  const [termsError, setTermsError] = useState("");
  const openTerms = () => {
    setTermsOpen(true);
    if (terms) return; // 한 번 받아온 본문은 재사용
    getTerms()
      .then(setTerms)
      .catch((e) => setTermsError(e instanceof Error ? e.message : "약관을 불러오지 못했습니다."));
  };

  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (location.state as { from?: string })?.from ?? "/seller";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginForm.email || !loginForm.password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const { needsReconsent } = await login(loginForm.email, loginForm.password);
      // 개인정보 동의 보관기간 만료 시 재동의 (백엔드 business_consent 연동)
      if (needsReconsent && window.confirm("개인정보 수집·이용 동의 보관기간이 만료되었습니다. 계속 이용하려면 다시 동의해 주세요.\n동의하시겠습니까?")) {
        await businessReconsent().catch(() => {});
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

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
      else setError(message); // 미등록·폐업 — 다음 단계로 못 가게 막고 사유를 그대로 보여준다
    } catch {
      // 진위확인 API 자체가 죽었을 때는 가입을 막지 않는다 — 최종 가입 시 서버가 다시 검증하므로
      setBizMessage("지금은 진위확인 서버에 연결할 수 없어 형식만 확인했습니다. 최종 가입 시 다시 확인됩니다.");
      setBizVerified(true);
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

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setStep(1);
  };

  const formatBizNo = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  // 연락처 자동 하이픈 (표시용 — 전송 시에는 숫자만 추출)
  const formatPhone = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  // ── 가입 완료 화면 ──
  if (completed) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-md text-center rounded-sm border border-border bg-card p-10">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            주최자 가입 신청이 완료되었습니다
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            <strong className="text-foreground">{signupForm.email}</strong> 계정이 활성화되었습니다.<br />
            지금 바로 주최자센터에서 팝업을 등록할 수 있으며,<br />등록한 팝업은 관리자 심사 후 게시됩니다.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/")} className="text-sm border border-border px-5 py-2.5 rounded-sm hover:border-foreground transition-colors">
              홈으로 가기
            </button>
            <button onClick={() => navigate("/seller")} className="text-sm bg-accent text-white px-5 py-2.5 rounded-sm hover:bg-accent/90 transition-colors">
              주최자센터 둘러보기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-16 px-6">
      <div className="w-full max-w-md">
        {/* Logo / heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
            </div>
            <span className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>팝업온</span>
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            {tab === "login" ? "주최자 계정으로 로그인" : "주최자 회원가입"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tab === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
            <button onClick={() => switchTab(tab === "login" ? "signup" : "login")} className="text-accent underline underline-offset-4">
              {tab === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
        </div>

        {/* Tab indicator */}
        <div className="flex rounded-sm border border-border overflow-hidden mb-8">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-foreground text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        {/* 회원가입 단계 표시 */}
        {tab === "signup" && (
          <div className="flex items-center mb-8">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as SignupStep;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border-2 ${
                        n < step
                          ? "bg-accent border-accent text-white"
                          : n === step
                            ? "border-accent text-accent bg-accent/10"
                            : "border-border text-muted-foreground bg-background"
                      }`}
                    >
                      {n < step ? <Check size={13} /> : n}
                    </div>
                    <span className={`text-[11px] whitespace-nowrap ${n === step ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${n < step ? "bg-accent" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-sm text-sm text-destructive">{error}</div>
        )}

        {/* ── 로그인 폼 ── */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">이메일</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="hello@brand.com"
                required
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">비밀번호</span>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="비밀번호 입력"
                  required
                  className={inputCls + " pr-10"}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" className="accent-accent" />
                로그인 상태 유지
              </label>
              <button type="button" className="hover:text-foreground transition-colors">비밀번호 찾기</button>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? "로그인 중…" : "로그인"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ── 회원가입 1단계: 계정 정보 ── */}
        {tab === "signup" && step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">이름 (담당자)</span>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="홍길동"
                required
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">이메일</span>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="hello@brand.com"
                required
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">비밀번호</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="8자 이상"
                    required
                    minLength={8}
                    className={inputCls + " pr-9"}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">비밀번호 확인</span>
                <input
                  type={showPw ? "text" : "password"}
                  value={signupForm.passwordConfirm}
                  onChange={(e) => setSignupForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                  placeholder="재입력"
                  required
                  className={
                    inputCls +
                    (pwMatch === true ? " border-green-400 focus:ring-green-400 focus:border-green-400" : pwMatch === false ? " border-red-300" : "")
                  }
                />
              </label>
            </div>

            {/* 비밀번호 일치 실시간 표시 (7/29) — 확인란에 입력이 있을 때만 */}
            {pwMatch !== null && (
              <div className={`flex items-center gap-1.5 text-xs -mt-3 ${pwMatch ? "text-green-600" : "text-red-500"}`}>
                {pwMatch ? <Check size={13} /> : <X size={13} />}
                {pwMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
              </div>
            )}

            {/* Password strength hint */}
            {signupForm.password && (
              <div className="flex gap-1">
                {[8, 12, 16].map((len, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-colors ${signupForm.password.length >= len ? "bg-accent" : "bg-border"}`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {signupForm.password.length < 8 ? "약함" : signupForm.password.length < 12 ? "보통" : "강함"}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={signupForm.agree}
                  onChange={(e) => setSignupForm((p) => ({ ...p, agree: e.target.checked }))}
                  className="mt-0.5 accent-accent"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">[필수]</span>{" "}
                  {/* 멘토 피드백: 동의 전에 본문을 열람할 수 있어야 함 → 클릭 시 모달로 전문 표시 */}
                  <button type="button" onClick={openTerms} className="underline underline-offset-2 text-foreground hover:text-accent">
                    이용약관 및 개인정보처리방침
                  </button>
                  에 동의합니다. 수집된 정보는 주최자 심사 및 서비스 제공 목적으로만 사용됩니다.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 accent-accent" />
                <span className="text-xs text-muted-foreground">[선택] 마케팅 정보 수신에 동의합니다.</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
            >
              다음: 사업자 확인
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ── 회원가입 2단계: 사업자등록번호 확인 ── */}
        {tab === "signup" && step === 2 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-sm bg-secondary border border-border">
              <Building2 size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                팝업온 주최자는 <span className="text-foreground font-medium">사업자 인증</span>이 필요합니다. 입력한 번호는 국세청 사업자등록 상태조회로 진위를 확인합니다.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">사업자등록번호</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={bizNo}
                  onChange={(e) => { setBizNo(formatBizNo(e.target.value)); setBizVerified(false); setBizMessage(""); }}
                  placeholder="123-45-67890"
                  className={inputCls + " flex-1"}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  type="button"
                  onClick={verifyBizNo}
                  disabled={bizChecking}
                  className="shrink-0 px-4 text-sm rounded-sm border border-foreground hover:bg-foreground hover:text-primary-foreground transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bizChecking && <Loader2 size={13} className="animate-spin" />}
                  {bizChecking ? "확인 중…" : "진위확인"}
                </button>
              </div>
            </label>

            {bizVerified && (
              <div className="rounded-sm border border-green-200 bg-green-50 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <CheckCircle size={14} /> 사업자등록번호가 확인되었습니다
                </div>
                <p className="text-xs text-green-800/90 leading-relaxed">
                  {/* 국세청 응답을 그대로 보여준다 — 진위확인 서버 장애로 형식만 통과한 경우 그 사실도 여기 표시된다 */}
                  {bizMessage || "국세청 사업자등록 상태조회를 통과했습니다."} 최종 가입 시 한 번 더 검증됩니다.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border border-border rounded-sm text-sm hover:border-foreground transition-colors"
              >
                <ArrowLeft size={15} /> 이전
              </button>
              <button
                type="button"
                disabled={!bizVerified}
                onClick={() => { setStep(3); setError(""); }}
                className="flex-1 py-3.5 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                다음: 주최자 상세
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── 회원가입 3단계: 주최자 상세 ── */}
        {tab === "signup" && step === 3 && (
          <form onSubmit={handleStep3} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">브랜드명 *</span>
                <input
                  value={detail.brandName}
                  onChange={(e) => setDetail((p) => ({ ...p, brandName: e.target.value }))}
                  required
                  placeholder="예: MINU Studio"
                  className={smallInputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">카테고리 *</span>
                <select
                  value={detail.category}
                  onChange={(e) => setDetail((p) => ({ ...p, category: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-foreground"
                >
                  <option value="" disabled>{keywords.length ? "카테고리 선택" : "카테고리 목록을 불러오는 중…"}</option>
                  {keywords.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">담당자 성명 *</span>
                <input
                  value={detail.contactName}
                  onChange={(e) => setDetail((p) => ({ ...p, contactName: e.target.value }))}
                  required
                  placeholder="홍길동"
                  className={smallInputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">연락처 (휴대폰) *</span>
                <input
                  value={detail.phone}
                  onChange={(e) => setDetail((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  className={smallInputCls}
                />
              </label>
            </div>

            {/* 7/29 기능 정리 — 브랜드 웹사이트·희망 팝업 시작일 칸 제거 (일단 주석 보존).
                웹사이트는 팝업등록의 SNS 링크로, 시작일은 팝업등록의 운영기간으로 대체됐다.
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">브랜드 웹사이트</span>
                <input
                  value={detail.website}
                  onChange={(e) => setDetail((p) => ({ ...p, website: e.target.value }))}
                  type="url"
                  placeholder="https://brand.com"
                  className={smallInputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">희망 팝업 시작일</span>
                <input
                  value={detail.expectedDate}
                  onChange={(e) => setDetail((p) => ({ ...p, expectedDate: e.target.value }))}
                  type="date"
                  className="w-full px-3 py-2.5 text-sm rounded-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-foreground"
                />
              </label>
            </div>
            */}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              가입 즉시 주최자센터 계정이 활성화됩니다. 등록하는 팝업은 게시 전 플랫폼 관리자의 건별 심사를 거칩니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(2); setError(""); }}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border border-border rounded-sm text-sm hover:border-foreground transition-colors"
              >
                <ArrowLeft size={15} /> 이전
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? "가입 처리 중…" : "주최자 가입 완료"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* Trust badges */}
        <div className="mt-8 pt-6 border-t border-border flex justify-center gap-6">
          {["SSL 암호화", "개인정보 보호", "스팸 없음"].map((item) => (
            <div key={item} className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle size={11} className="text-accent" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* 약관·개인정보처리방침 모달 — 배경 클릭 시 닫힘, 본문은 서버(/api/terms)에서 로드 */}
      {termsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setTermsOpen(false)}>
          <div className="bg-white rounded-sm border border-border w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">{terms?.title ?? "이용약관 및 개인정보처리방침"}</span>
              <button onClick={() => setTermsOpen(false)} className="text-muted-foreground hover:text-foreground" title="닫기">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap">
              {termsError ? (
                <span className="text-xs text-red-500">{termsError}</span>
              ) : terms ? (
                terms.content
              ) : (
                <span className="text-xs text-muted-foreground">
                  <Loader2 size={13} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </span>
              )}
            </div>
            {terms?.updatedAt && (
              <div className="px-5 py-2.5 border-t border-border text-[11px] text-muted-foreground">
                최종 개정: {terms.updatedAt.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
