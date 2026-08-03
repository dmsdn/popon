"use client";

// app/select-popup/page.tsx
// 로그인한 주최측이 운영중인 팝업 목록을 보여주고, "웨이팅 시작하기"를 누르면
// 그 팝업의 웨이팅 등록 화면(/checkin?popupId=X)으로 이동해요.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getBusinessInfo, saveSelectedPopup, clearSession } from "@/lib/auth";

// [수정] 실제 백엔드(PopupResponse)가 내려주는 status는 "예정"/"진행중"/"종료"
// 같은 한글이 아니라 PENDING/REJECTED/BEFOR/OPEN/CLOSED/SUSPENDED 영문
// 코드예요. 프론트가 한글 문자열이라고 잘못 가정하고 있어서 비교(===)가
// 한 번도 안 맞아 상태 표시/필터가 전부 죽어있었어요 - 실제 값으로 고쳤어요.
type RawStatus = "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED" | "SUSPENDED";

interface MyPopup {
  id: number;
  title: string;
  status: RawStatus;
  startDate: string;
  endDate: string;
}

const STATUS_LABEL: Record<RawStatus, string> = {
  PENDING: "심사중",
  REJECTED: "반려됨",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "운영중단",
};

// [수정] 모든 상태가 같은 남색 배경이라 구분이 잘 안 됐어요. 상태 성격에 맞게
// 디자인을 다르게 나눴어요:
// - 진행중/오픈예정: 포인트 컬러 테두리 (지금 주목해야 할 상태)
// - 종료: 밝은 회색 테두리 (더 이상 진행 안 함, 톤 다운)
// - 반려됨: 붉은색 톤 (부정적인 상태라 눈에 띄게)
// - 심사중/운영중단: 각자 다른 색의 옅은 배경 (진행중/종료와는 또 다른, "대기/보류" 느낌)
function statusBadgeClass(status: RawStatus): string {
  switch (status) {
    case "OPEN":
    case "BEFOR":
      return "bg-transparent text-point border border-point";
    case "CLOSED":
      return "bg-transparent text-gray-300 border border-gray-400";
    case "REJECTED":
      return "bg-red-500/15 text-red-400 border border-red-500/40";
    case "PENDING":
      return "bg-amber-500/15 text-amber-400 border border-transparent";
    case "SUSPENDED":
      return "bg-slate-500/20 text-slate-300 border border-transparent";
  }
}

// [신규] 계정 탭 - 브랜드 로고 이미지 + 아이디(이메일) + 로그아웃 버튼을 한 덩어리로
// 묶어서 팝업 목록과 시각적으로 구분해요. 이미지 로드에 실패하거나 아직 없으면
// 회사명 첫 글자로 된 이니셜 아바타로 대체돼요.
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
  // [신규] 웨이팅/예약할지 정말지 지금 진행중(OPEN)인 팝업 아니면 애초에 필요가
  // 없다는 피드백 - 오픈예정/종료/심사중 등은 목록에서 아예 빼고, 상태 필터
  // 탭도 통째로 없앴어요(고를 상태가 하나뿐이라 필터가 무의미해졌어요). 정렬은
  // 사용자가 고르는 대신 이름 가나다순 → 같은 이름이면 시작일 순으로 고정했어요.
  // [신규] "웨이팅 시작하기"를 눌렀을 때 비밀번호를 한 번 더 확인받기 위한 상태.
  // 브랜드 계정 비밀번호(로그인할 때 쓴 것과 동일)로 확인해요 - 실제로는
  // 로그인 API에 같은 이메일+새로 입력한 비밀번호로 다시 호출해서, 성공하면
  // 맞는 비밀번호라고 판단해요(새 검증 API를 따로 안 만들어도 돼요).
  const [pendingPopup, setPendingPopup] = useState<MyPopup | null>(null);
  // [신규] "웨이팅 시작하기"(손님 셀프 등록 화면)와 "QR 입장 찍기"(직원 QR
  // 스캔 화면)를 별도 버튼·별도 화면으로 나눴어요. 비밀번호 확인은 공통으로
  // 거치되, 확인 후 어느 화면으로 보낼지만 이 값으로 구분해요.
  const [pendingTarget, setPendingTarget] = useState<"/checkin" | "/checkin/scan">("/checkin");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // [수정] getBusinessInfo()를 렌더링 중에 바로 호출하면, sessionStorage가 없는
  // 서버에서는 null이 나오고 클라이언트(하이드레이션 후)에서는 실제 값이 나와서
  // 서버/클라이언트 렌더 결과가 달라져 하이드레이션 에러가 났어요. useEffect
  // 안에서 클라이언트 마운트 후에만 읽도록 옮겼어요 - 이러면 최초 렌더는
  // 서버/클라이언트 둘 다 "아직 없음(null)"으로 동일하고, 마운트 직후에만
  // 실제 값으로 업데이트돼요.
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
  // 가나다순 → 같은 이름이면 시작일이 빠른 순으로 고정 정렬했어요.
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
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(popup.status)}`}>
                  {STATUS_LABEL[popup.status]}
                </span>
              </div>
              <p className="text-lg font-bold">{popup.title}</p>
              <p className="text-sm text-gray-400">
                {popup.startDate} ~ {popup.endDate}
              </p>
              {/* [수정] "웨이팅 시작하기"(손님 셀프 등록 화면)와 "QR 입장 찍기"
                  (직원 QR 스캔 화면)를 한 버튼에 몰아넣지 않고 각각 눌러서
                  원하는 화면으로 바로 갈 수 있게 나눴어요. */}
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

      {/* [신규] 웨이팅 시작하기/QR 입장 찍기 전 비밀번호 확인 모달 - 어느
          버튼을 눌렀는지에 따라 안내 문구와 확인 버튼 문구가 달라져요. */}
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
