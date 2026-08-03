// lib/useActiveQueueCount.ts
//
// [신규] 상단바/하단바의 "예약/웨이팅" 아이콘에 몇 개나 활성 상태인지 말풍선
// 배지로 보여주기 위한 공용 훅이에요. 취소된 예약, 이미 끝난 웨이팅은 세지 않고
// "지금 살아있는" 것만 세요.
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyReservations } from "@/lib/api/reservations";
import { getMyWaitingIds, getMyWaitingStatus } from "@/lib/api/waiting";

export function useActiveQueueCount() {
  const { customer, isLoggedIn } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !customer) {
      setCount(0);
      return;
    }
    let cancelled = false;

    Promise.all([
      getMyReservations(customer.id).catch(() => []),
      Promise.all(getMyWaitingIds().map((id) => getMyWaitingStatus(id).catch(() => null))),
    ]).then(([reservations, waitings]) => {
      if (cancelled) return;
      const activeReservations = reservations.filter((r) => r.status !== "CANCELLED").length;
      const activeWaitings = waitings.filter((w) => w && (w.status === "WAITING" || w.status === "CALLED")).length;
      setCount(activeReservations + activeWaitings);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  return count;
}
