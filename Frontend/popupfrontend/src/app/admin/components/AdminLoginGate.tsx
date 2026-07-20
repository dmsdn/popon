import { useState } from "react";
import { Loader2, ShieldCheck, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// 관리자 로그인 폼 (관리자 계정은 DB에서 직접 발급 — 회원가입 없음)
export default function AdminLoginGate({ onSuccess }: { onSuccess?: () => void }) {
  const { adminLogin } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await adminLogin(form.email, form.password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm bg-white border border-border rounded-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-accent" />
        <span className="text-sm font-semibold">관리자 로그인</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">관리자 계정으로만 접근할 수 있습니다.</p>
      {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-sm text-xs text-red-600">{error}</div>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="관리자 이메일"
          required
          className="px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="비밀번호"
          required
          className="px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />} 로그인
        </button>
      </form>
    </div>
  );
}
