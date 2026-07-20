import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { saveInterests } from "../lib/api";

// 카카오 로그인 성공 시 customerbackend(:8081)가
// /login/success?token=<JWT> 로 리다이렉트해 주는 수신 페이지
export default function LoginSuccess() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token && loginWithToken(token)) {
      // 가입 설문에서 고른 관심 카테고리를 백엔드에 저장 (실패해도 로그인은 유지)
      try {
        const interests = JSON.parse(localStorage.getItem("interests") ?? "[]") as string[];
        if (interests.length > 0) saveInterests(interests).catch(() => {});
      } catch {
        // 무시
      }
      navigate("/", { replace: true });
    } else {
      setFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-6 pt-20 pb-8 text-center">
      {failed ? (
        <>
          <XCircle size={40} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            로그인에 실패했어요
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            토큰이 없거나 만료되었어요.<br />다시 시도해 주세요.
          </p>
          <Link to="/login" className="inline-block text-sm px-6 py-3 rounded-lg bg-accent text-white font-medium">
            로그인 페이지로
          </Link>
        </>
      ) : (
        <>
          <CheckCircle size={40} className="mx-auto text-accent mb-4" />
          <p className="text-sm text-muted-foreground">로그인 처리 중…</p>
        </>
      )}
    </div>
  );
}
