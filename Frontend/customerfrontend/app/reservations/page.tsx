// app/reservations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyReservations, cancelReservation, type Reservation } from "@/lib/api/reservations";
import {
  getMyWaitingStatus,
  cancelWaiting,
  getActiveWaitingId,
  clearActiveWaitingId,
  type Waiting,
} from "@/lib/api/waiting";
import { RESERVATION_STATUS_LABEL, WAITING_STATUS_LABEL, WAITING_STATUS } from "@/lib/constants/status";

export default function ReservationsPage() {
  const { customer } = useAuth();
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const list = await getMyReservations(customer!.id);
        if (!cancelled) setReservations(list.filter((r) => r.status !== "CANCELLED"));
      } catch (err) {
        console.error("예약 목록 조회 실패", err);
      }

      const activeId = getActiveWaitingId();
      if (activeId) {
        try {
          const w = await getMyWaitingStatus(activeId);
          // 취소되었거나 이미 입장 완료된 웨이팅은 더 이상 활성 상태가 아님
          if (w.status === WAITING_STATUS.CANCELLED || w.status === WAITING_STATUS.ENTERED) {
            clearActiveWaitingId();
            if (!cancelled) setWaiting(null);
          } else if (!cancelled) {
            setWaiting(w);
          }
        } catch (err) {
          console.error("웨이팅 상태 조회 실패", err);
          clearActiveWaitingId();
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  const handleCancelWaiting = async () => {
    if (!waiting || !confirm("웨이팅을 취소할까요?")) return;
    try {
      await cancelWaiting(waiting.id);
      clearActiveWaitingId();
      setWaiting(null);
    } catch (err) {
      console.error("웨이팅 취소 실패", err);
      alert("웨이팅 취소에 실패했어요.");
    }
  };

  const handleCancelReservation = async (id: number) => {
    if (!confirm("예약을 취소할까요?")) return;
    try {
      await cancelReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("예약 취소 실패", err);
      alert("예약 취소에 실패했어요.");
    }
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
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">불러오는 중이에요...</p>
          ) : waiting ? (
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-4 mobile:gap-6">
                <div className="w-20 h-20 mobile:w-24 mobile:h-24 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  이미지
                </div>
                <div className="flex-1">
                  <span className="inline-block text-xs text-gray-500 mb-1">
                    {WAITING_STATUS_LABEL[waiting.status]}
                  </span>
                  <p className="text-sm font-semibold mb-1">웨이팅 #{waiting.teamNumber}</p>
                  <p className="text-xs text-gray-500 mb-1">{waiting.partySize}명</p>
                  <p className="text-xs text-gray-500">앞 {waiting.teamsAhead}팀</p>
                </div>
                <div className="text-right flex-none">
                  <span className="text-3xl font-bold">{waiting.teamNumber}</span>
                  <span className="text-xs text-gray-500 ml-0.5">번째</span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleCancelWaiting}
                  className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700"
                >
                  웨이팅 취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center border border-gray-100 rounded-xl">
              진행 중인 웨이팅이 없어요.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">예약</h2>
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">불러오는 중이에요...</p>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center border border-gray-100 rounded-xl">
              예약 내역이 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-xl p-5 flex items-center gap-4 mobile:gap-6">
                  <div className="w-20 h-20 mobile:w-24 mobile:h-24 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                    이미지
                  </div>
                  <div className="flex-1">
                    <span className="inline-block text-xs text-gray-500 mb-1">
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
                    <p className="text-sm font-semibold mb-1">
                      {r.reservationDate ?? `슬롯 #${r.slotId}`} · {r.partySize}명
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelReservation(r.id)}
                    className="text-xs text-gray-400 flex-none"
                  >
                    취소
                  </button>
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