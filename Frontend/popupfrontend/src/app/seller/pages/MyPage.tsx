import { useEffect, useRef, useState } from "react";
import { Loader2, User, KeyRound, Save, Image as ImageIcon, Info } from "lucide-react";
import { getMyInfo, updateMyInfo, changeMyPassword, uploadBusinessProfileImage, BusinessInfo } from "../../lib/api";

// 주최자 마이페이지 — 7/25 피드백으로 신설. 상단바 계정 영역(ChevronDown)에서 진입.
// 실연동: 내 정보 조회(GET /me)·수정(PUT /me — 브랜드명·연락처)·비밀번호 변경(PUT /me/password)
// 브랜드 사진: POST /me/profile-image (multipart) — 서버가 500×500 JPEG으로 변환해 저장 (7/29 연동)

const inputCls =
  "w-full px-3 py-2.5 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent";
const labelCls = "block text-xs font-medium mb-1.5";

// 연락처 자동 하이픈 (표시용 — 전송 시 숫자만; 회원가입과 동일 규칙)
const formatPhone = (v: string) => {
  const d = v.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

export default function MyPage() {
  const [info, setInfo] = useState<BusinessInfo | null>(null);
  const [loadError, setLoadError] = useState("");

  // 기본 정보 수정 폼
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // 비밀번호 변경 폼
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 브랜드 사진 업로드
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("이미지는 10MB 이하만 등록할 수 있습니다.");
    setPhotoUploading(true);
    try {
      // 응답이 갱신된 내 정보라 그대로 갈아끼우면 화면의 사진이 즉시 바뀐다
      setInfo(await uploadBusinessProfileImage(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "브랜드 사진 등록에 실패했습니다.");
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = ""; // 같은 파일을 다시 고를 수 있게
    }
  };

  useEffect(() => {
    let alive = true;
    getMyInfo()
      .then((i) => {
        if (!alive) return;
        setInfo(i);
        setCompanyName(i.companyName);
        setPhone(formatPhone(i.phone ?? ""));
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "내 정보를 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, []);

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg("");
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
      alert("연락처는 01로 시작하는 휴대폰 번호 10~11자리여야 합니다.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyInfo({ companyName: companyName.trim(), phone: phoneDigits });
      setInfo(updated);
      // 헤더의 이름 표시(AuthContext localStorage)도 함께 갱신 — 새로고침 시 반영
      try {
        const raw = localStorage.getItem("authUser");
        if (raw) {
          const u = JSON.parse(raw);
          u.name = updated.companyName;
          localStorage.setItem("authUser", JSON.stringify(u));
        }
      } catch { /* 손상된 값은 무시 */ }
      setSavedMsg("저장되었습니다. (상단 표시 이름은 새로고침 후 반영)");
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (pw.next.length < 8) {
      setPwMsg({ ok: false, text: "새 비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    setPwSaving(true);
    try {
      await changeMyPassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "비밀번호가 변경되었습니다." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다." });
    } finally {
      setPwSaving(false);
    }
  };

  if (loadError) {
    return <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{loadError}</div>;
  }
  if (!info) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold">마이페이지</h1>
        <p className="text-xs text-muted-foreground mt-0.5">주최자 계정 정보를 확인하고 수정합니다.</p>
      </div>

      {/* 브랜드 프로필 */}
      <div className="bg-white border border-border rounded-sm p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {info.profileImage ? (
            <img src={info.profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold">{info.companyName.slice(0, 1)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{info.companyName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{info.email}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
            사업자등록번호 {info.businessNumber}
          </div>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          disabled={photoUploading}
          title="JPG·PNG · 서버가 500×500으로 변환합니다"
          className="shrink-0 flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-sm border border-border text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {photoUploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
          {info.profileImage ? "브랜드 사진 변경" : "브랜드 사진 등록"}
        </button>
      </div>

      {/* 기본 정보 수정 */}
      <form onSubmit={saveInfo} className="bg-white border border-border rounded-sm">
        <div className="px-5 py-3 border-b border-border flex items-center gap-1.5 text-sm font-semibold">
          <User size={14} className="text-accent" /> 기본 정보
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>브랜드명(상호)</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>연락처 (휴대폰)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required type="tel" inputMode="numeric" placeholder="010-0000-0000"
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>이메일 (로그인 계정)</label>
              <input value={info.email} disabled className={inputCls + " bg-secondary/40 text-muted-foreground"} />
            </div>
            <div>
              <label className={labelCls}>사업자등록번호</label>
              <input value={info.businessNumber} disabled className={inputCls + " bg-secondary/40 text-muted-foreground"} style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info size={11} /> 이메일·사업자등록번호는 계정 식별값이라 변경할 수 없습니다.
          </p>
          <div className="flex items-center justify-end gap-3">
            {savedMsg && <span className="text-xs text-emerald-600">{savedMsg}</span>}
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장
            </button>
          </div>
        </div>
      </form>

      {/* 비밀번호 변경 */}
      <form onSubmit={savePassword} className="bg-white border border-border rounded-sm">
        <div className="px-5 py-3 border-b border-border flex items-center gap-1.5 text-sm font-semibold">
          <KeyRound size={14} className="text-accent" /> 비밀번호 변경
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>현재 비밀번호</label>
              <input type="password" required value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>새 비밀번호 (8자 이상)</label>
              <input type="password" required minLength={8} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>새 비밀번호 확인</label>
              <input
                type="password" required value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                className={
                  inputCls +
                  (pw.confirm ? (pw.next === pw.confirm ? " border-green-400" : " border-red-300") : "")
                }
              />
              {/* 일치 여부 실시간 표시 (7/29) — 확인란에 입력이 있을 때만 */}
              {pw.confirm && (
                <p className={`mt-1 text-[11px] ${pw.next === pw.confirm ? "text-green-600" : "text-red-500"}`}>
                  {pw.next === pw.confirm ? "✓ 비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {pwMsg && <span className={`text-xs ${pwMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{pwMsg.text}</span>}
            <button type="submit" disabled={pwSaving} className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50">
              {pwSaving ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} 변경
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
