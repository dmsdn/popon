import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import AdminLoginGate from "../components/AdminLoginGate";

export default function AdminLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "admin") navigate("/admin", { replace: true });
  }, [user, navigate]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">관리자 로그인</h1>
        <p className="text-xs text-muted-foreground mt-0.5">관리자 계정은 별도 회원가입 없이 운영팀이 DB에서 직접 발급합니다.</p>
      </div>
      <AdminLoginGate onSuccess={() => navigate("/admin", { replace: true })} />
    </div>
  );
}
