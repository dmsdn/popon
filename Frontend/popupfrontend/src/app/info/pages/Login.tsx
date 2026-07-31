// 로그인 페이지 (7/30 리뉴얼)
// 회원가입은 /signup 으로 URL 분리됨. 이 파일은 로그인만 담당한다.
// 기존 기능 유지: from 리다이렉트, 재동의(needsReconsent), 비밀번호 표시 토글.
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { businessReconsent } from "../../lib/api";
import { pageBg, panelCls, labelCls, inputDark, primaryBtn, mutedText, errorBox, TrustBadges } from "./authShared";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string })?.from ?? "/seller";

  // 구 링크 호환 — URL 분리 전에는 /login 하나에 state.tab으로 탭을 실어 보냈다.
  // 옛 state로 들어오면 /signup으로 넘겨준다. (북마크·뒤로가기 잔존 대비)
  useEffect(() => {
    const wanted = (location.state as { tab?: string })?.tab;
    if (wanted === "signup") navigate("/signup", { replace: true });
  }, [location.state, navigate]);

  // 같은 URL 재클릭 시 입력 오류 표시 초기화 (location.key는 navigate마다 바뀐다)
  useEffect(() => {
    setError("");
  }, [location.key]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const { needsReconsent } = await login(form.email, form.password);
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

  return (
    <main className={pageBg}>
      <div className="max-w-5xl mx-auto px-6 py-14 lg:py-20">
        {/* 페이지 제목 — 폼 위에 크게 */}
        <h1 className="text-3xl font-extrabold mb-8 text-foreground" style={{ fontFamily: "'NanumSquareRound', sans-serif" }}>
          로그인
        </h1>

        <div className={`${panelCls} p-8 lg:p-10`}>
          <div className="grid lg:grid-cols-[1fr_300px] gap-10 lg:gap-14">
            {/* ── 좌: 로그인 폼 ── */}
            <form onSubmit={handleLogin} className="space-y-5">
              {error && <div className={errorBox}>{error}</div>}

              <label className="flex flex-col gap-2">
                <span className={labelCls}>주최자 계정 이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="hello@brand.com"
                  required
                  autoComplete="email"
                  className={inputDark}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className={labelCls}>비밀번호</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="비밀번호 입력"
                    required
                    autoComplete="current-password"
                    className={inputDark + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="accent-[currentColor]" />
                  로그인 상태 유지
                </label>
                <button type="button" className="hover:text-foreground transition-colors">
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`${primaryBtn} w-full max-w-[300px] py-3.5 flex items-center justify-center gap-2`}
              >
                {submitting ? "로그인 중…" : "로그인"}
                <ArrowRight size={16} />
              </button>
            </form>

            {/* ── 우: 안내 패널 — 로그인하면 무엇을 할 수 있는지 ── */}
            <aside className="border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 lg:pl-10">
              <h2 className={`${labelCls} mb-4`}>주최자센터에서 할 수 있는 일</h2>
              <ul className={`space-y-3 text-sm ${mutedText}`}>
                <li className="flex gap-2"><span className="text-accent">›</span> 팝업 등록과 심사 현황 확인</li>
                <li className="flex gap-2"><span className="text-accent">›</span> 예약·현장 웨이팅 통합 관제</li>
                <li className="flex gap-2"><span className="text-accent">›</span> 방문자 통계와 성과 리포트</li>
                <li className="flex gap-2"><span className="text-accent">›</span> 긴급 공지 발송과 문의 관리</li>
              </ul>
              <p className={`mt-6 text-xs leading-relaxed ${mutedText}`}>
                등록한 팝업은 게시 전 플랫폼 관리자의 건별 심사를 거칩니다.
              </p>
            </aside>
          </div>

          {/* ── 하단: 아직 계정이 없는 사람을 위한 회원가입 유도 ── */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <span className="text-sm text-foreground font-medium">팝온이 처음이신가요?</span>
            <button
              onClick={() => navigate("/signup")}
              className="text-sm px-6 py-2.5 rounded-sm border border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              주최자 계정 만들기
            </button>
            <span className={`text-xs ${mutedText}`}>사업자 인증 후 바로 팝업을 등록할 수 있습니다.</span>
          </div>
        </div>

        <TrustBadges />
      </div>
    </main>
  );
}
