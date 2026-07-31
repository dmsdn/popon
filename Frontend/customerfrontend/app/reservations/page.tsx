"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

// TODO: 실제로는 백엔드 API(getMyWaiting, getMyReservations)로 대체
const mockWaiting = {
  id: "w1",
  popupName: "팝업 이름",
  location: "위치",
  partySize: 0,
  registeredAt: "11:00",
  aheadCount: 7,
  estimatedMinutes: 10,
  myOrder: 7,
};

const mockReservations = [
  { id: "r1", popupName: "팝업 이름", dDay: "D-1", date: "26. 07. 16. (목)", time: "오후 13:30", partySize: 2 },
];

export default function ReservationsPage() {
  const [waiting, setWaiting] = useState<typeof mockWaiting | null>(mockWaiting);

  const handleCancelWaiting = () => {
    if (!confirm("웨이팅을 취소할까요?")) return;
    // TODO: 실제 취소 API 연결
    setWaiting(null);
  };

  const handlePostponeWaiting = () => {
    // TODO: 실제 미루기 API 연결
    alert("웨이팅 순서를 미뤘어요.");
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <MobileHeader />
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-10">
        <section>
          <h2 className="text-base font-semibold mb-3">웨이팅</h2>
          {waiting ? (
            <div className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5">
              <div className="flex items-start gap-4 mobile:gap-6">
                <div className="w-20 h-20 mobile:w-24 mobile:h-24 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                  이미지
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">{waiting.popupName}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    {waiting.location} {waiting.partySize}명 {waiting.registeredAt} 등록
                  </p>
                  <p className="text-sm text-gray-500">
                    앞 {waiting.aheadCount}팀 | 예상 대기시간 약 {waiting.estimatedMinutes}분
                  </p>
                </div>
                <div className="text-right flex-none">
                  <span className="text-3xl font-bold">{waiting.myOrder}</span>
                  <span className="text-sm text-gray-500 ml-0.5">번째</span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleCancelWaiting}
                  className="flex-1 rounded-full py-3 text-base font-medium bg-gray-100 text-gray-700 dark:text-gray-300"
                >
                  웨이팅 취소
                </button>
                <button
                  type="button"
                  onClick={handlePostponeWaiting}
                  className="flex-1 rounded-full py-3 text-base font-medium border border-gray-300"
                >
                  웨이팅 미루기
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center border border-gray-100 dark:border-[#282B32] rounded-xl">
              진행 중인 웨이팅이 없어요.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">예약</h2>
          {mockReservations.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center border border-gray-100 dark:border-[#282B32] rounded-xl">
              예약 내역이 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {mockReservations.map((r) => (
                <div key={r.id} className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex items-center gap-4 mobile:gap-6">
                  <div className="w-20 h-20 mobile:w-24 mobile:h-24 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                    이미지
                  </div>
                  <div>
                    <span className="inline-block text-sm text-gray-500 mb-1">{r.dDay}</span>
                    <p className="text-sm font-semibold mb-1">{r.popupName}</p>
                    <p className="text-sm text-gray-500">
                      {r.date} {r.time} {r.partySize}명
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}