// app/select-popup/page.tsx
// 로그인한 주최측이 운영중인 팝업 목록
"use client";

// "웨이팅 시작하기"를 누르면 그 팝업의 웨이팅 등록 화면(/checkin?popupId=X)으로 이동
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getBusinessInfo, saveSelectedPopup, clearSession } from "@/lib/auth";

// [수정] 팝업 상태값을 백엔드 실제 값에 맞게 수정하여 상태 표시 및 필터 기능이 정상적으로 작동하도록 개선
type RawStatus = "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED" | "SUSPENDED";

interface MyPopup {
  id: number;
  title: string;
  status: RawStatus;
  startDate: string;
  endDate: string;
}

// [신규] 계정 탭 - 계정 탭에 브랜드 로고, 아이디(이메일), 로그아웃 기능을 추가 
// (로고가 없거나 로드되지 않을 경우 회사명 이니셜 아바타로 대체)
function AccountTab({
  companyName,
  email,
  profileImageUrl,
  onLogout,
}: {
  companyName: string;
  email?: string;
  profileImageUrl?: string;
  onLogout: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!profileImageUrl && !imgFailed;
  const initial = companyName.trim().charAt(0) || "?";

  return (
    <div className="flex items-center gap-3 bg-card rounded-full pl-2 pr-3 py-2 self-start">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImageUrl}
          alt={companyName}
          onError={() => setImgFailed(true)}
          className="w-10 h-10 rounded-full object-cover flex-none bg-gray-700"
        />
      ) : (
        <div className="w-10 h-10 rounded-full flex-none bg-point/20 text-point font-bold flex items-center justify-center">
          {initial}
        </div>
      )}
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-semibold truncate max-w-[10rem]">{companyName}</span>
        {email && <span className="text-xs text-gray-400 truncate max-w-[10rem]">{email}</span>}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="ml-2 text-xs text-gray-400 underline underline-offset-4 flex-none"
      >
        로그아웃
      </button>
    </div>
  );
}

export default function SelectPopupPage() {
  const router = useRouter();
  const [popups, setPopups] = useState<MyPopup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // [신규] 지금 진행중(OPEN)인 팝업만 목록에 노출
  //  > 상태 필터 탭도 제거(고를 상태가 하나뿐이라 무의미). 정렬은 이름 가나다순 → 같은 이름이면 시작일 순 고정
  // [신규] "웨이팅 시작하기" 전 비밀번호 재확인 상태 - 브랜드 계정 비밀번호(로그인과 동일)로 확인
  //  > 로그인 API를 같은 이메일+새 비밀번호로 재호출해 성공 여부로 판단
  const [pendingPopup, setPendingPopup] = useState<MyPopup | null>(null);
  // [신규] "웨이팅 시작하기"(손님 셀프 등록)와 "QR 입장 찍기"(직원 스캔)를 별도 버튼·화면으로 분리
  // 비밀번호 확인은 공통, 확인 후 이동할 화면만 이 값으로 구분
  const [pendingTarget, setPendingTarget] = useState<"/checkin" | "/checkin/scan">("/checkin");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // [수정] getBusinessInfo()를 렌더링 중 직접 호출하면 서버/클라이언트 결과가 달라 하이드레이션 에러 발생
  // > useEffect 안에서 마운트 후에만 읽도록 이동
  const [business, setBusiness] = useState<{
    businessId: number;
    companyName: string;
    email?: string;
    profileImageUrl?: string;
  } | null>(null);

  useEffect(() => {
    setBusiness(getBusinessInfo());
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }
    fetch("/api/popups/my", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          clearSession();
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("팝업 목록을 불러오지 못했어요.");
        return res.json();
      })
      .then((data) => {
        if (data) setPopups(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "오류가 발생했어요."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (popup: MyPopup, target: "/checkin" | "/checkin/scan") => {
    setPendingPopup(popup);
    setPendingTarget(target);
    setConfirmPassword("");
    setConfirmError(null);
  };

  const handleConfirmPassword = async () => {
    if (!pendingPopup || !confirmPassword || confirmSubmitting) return;
    if (!business?.email) {
      setConfirmError("계정 이메일을 확인할 수 없어요. 다시 로그인해주세요.");
      return;
    }
    setConfirmSubmitting(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/business/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: business.email, password: confirmPassword }),
      });
      if (!res.ok) {
        setConfirmError("비밀번호가 올바르지 않아요.");
        return;
      }
      saveSelectedPopup({ id: pendingPopup.id, title: pendingPopup.title });
      router.push(`${pendingTarget}?popupId=${pendingPopup.id}`);
    } catch {
      setConfirmError("서버에 연결할 수 없어요.");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  // [수정] 상태 필터·정렬 선택 UI를 없애고, "진행중(OPEN)"만 남긴 뒤 이름
  // 가나다순 → 같은 이름이면 시작일이 빠른 순으로 고정 정렬
  const filteredPopups = (popups ?? [])
    .filter((p) => p.status === "OPEN")
    .sort((a, b) => {
      const byTitle = a.title.localeCompare(b.title, "ko");
      if (byTitle !== 0) return byTitle;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  return (
    <main className="h-full flex flex-col px-6 py-6 landscape:px-10 landscape:py-8 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col gap-4 mb-8 landscape:flex-row landscape:items-center landscape:justify-between">
        <p className="text-xl font-bold">웨이팅 관리할 팝업을 선택해주세요</p>
        {business && (
          <AccountTab
            companyName={business.companyName}
            email={business.email}
            profileImageUrl={business.profileImageUrl}
            onLogout={handleLogout}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}


      {popups === null ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : popups.length === 0 ? (
        <p className="text-sm text-gray-400">운영중인 팝업이 없어요.</p>
      ) : filteredPopups.length === 0 ? (
        <p className="text-sm text-gray-400">지금 진행중인 팝업이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPopups.map((popup) => (
            <div key={popup.id} className="bg-card rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                {/* [수정] filteredPopups가 이미 OPEN만 통과시켜서 상태값이 항상 "진행중"으로 고정
                     > 배지도 고정 텍스트+고정 스타일로 단순화, STATUS_LABEL/statusBadgeClass 제거 */}
                <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-transparent text-point border border-point">
                  진행중
                </span>
              </div>
              <p className="text-lg font-bold">{popup.title}</p>
              <p className="text-sm text-gray-400">
                {popup.startDate} ~ {popup.endDate}
              </p>
              {/* [수정] "웨이팅 시작하기"와 "QR 입장 찍기"를 한 버튼에 몰아넣지 않고 분리 */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStart(popup, "/checkin")}
                  className="flex-1 rounded-full py-3 text-base font-bold bg-point text-gray-900"
                >
                  웨이팅 시작하기
                </button>
                <button
                  type="button"
                  onClick={() => handleStart(popup, "/checkin/scan")}
                  className="flex-1 rounded-full py-3 text-base font-bold border-2 border-point text-white"
                >
                  QR 입장 찍기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* [신규] 웨이팅 시작하기/QR 입장 찍기 전 비밀번호 확인 모달 - 버튼에 따라 문구가 달라짐 */}
      {pendingPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-8 z-50">
          <div className="bg-card rounded-2xl px-8 py-8 w-full max-w-sm">
            <p className="text-lg font-bold mb-1">{pendingPopup.title}</p>
            <p className="text-sm text-gray-400 mb-5">
              {pendingTarget === "/checkin"
                ? "비밀번호를 입력하고 웨이팅을 시작해주세요"
                : "비밀번호를 입력하고 QR 입장 화면을 열어주세요"}
            </p>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmPassword()}
              placeholder="비밀번호"
              autoFocus
              className="w-full bg-[#17181a] text-white rounded-xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-point mb-3"
            />
            {confirmError && <p className="text-sm text-red-400 mb-3">{confirmError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingPopup(null)}
                className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-700 text-gray-300"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmPassword}
                disabled={!confirmPassword || confirmSubmitting}
                className="flex-1 rounded-full py-3 text-sm font-bold bg-point text-gray-900 disabled:opacity-40"
              >
                {confirmSubmitting ? "확인하는 중..." : pendingTarget === "/checkin" ? "웨이팅 시작하기" : "QR 입장 찍기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
