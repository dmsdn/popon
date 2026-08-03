"use client";

// app/select-popup/page.tsx
// 로그인한 주최측이 운영중인 팝업 목록을 보여주고, "웨이팅 시작하기"를 누르면
// 그 팝업의 웨이팅 등록 화면(/checkin?popupId=X)으로 이동해요.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getBusinessInfo, saveSelectedPopup, clearSession } from "@/lib/auth";

interface MyPopup {
  id: number;
  title: string;
  status: "예정" | "진행중" | "종료";
  startDate: string;
  endDate: string;
}

export default function SelectPopupPage() {
  const router = useRouter();
  const [popups, setPopups] = useState<MyPopup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const business = getBusinessInfo();

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

  const handleStart = (popup: MyPopup) => {
    saveSelectedPopup({ id: popup.id, title: popup.title });
    router.push(`/checkin?popupId=${popup.id}`);
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <main className="h-full flex flex-col px-10 py-8 overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xl font-bold">웨이팅 관리할 팝업을 선택해주세요</p>
          {business && <p className="text-sm text-gray-400 mt-1">{business.companyName}</p>}
        </div>
        <button type="button" onClick={handleLogout} className="text-sm text-gray-400 underline underline-offset-4">
          로그아웃
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {popups === null ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : popups.length === 0 ? (
        <p className="text-sm text-gray-400">운영중인 팝업이 없어요.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {popups.map((popup) => (
            <div key={popup.id} className="bg-card rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                    popup.status === "진행중"
                      ? "bg-point/20 text-point"
                      : popup.status === "예정"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {popup.status}
                </span>
              </div>
              <p className="text-lg font-bold">{popup.title}</p>
              <p className="text-sm text-gray-400">
                {popup.startDate} ~ {popup.endDate}
              </p>
              <button
                type="button"
                onClick={() => handleStart(popup)}
                className="mt-2 w-full rounded-full py-3 text-base font-bold bg-point text-gray-900"
              >
                웨이팅 시작하기
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
