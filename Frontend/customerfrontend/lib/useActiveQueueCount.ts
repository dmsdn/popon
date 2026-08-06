// lib/useActiveQueueCount.ts
// 활성 예약·웨이팅 개수를 표시하는 공용 훅
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyReservations } from "@/lib/api/reservations";
import { getMyActiveWaitings } from "@/lib/api/waiting";
import { getPopup, HIDDEN_STATUSES } from "@/lib/api/popups";
import { ApiError } from "@/lib/api/client";

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
      getMyActiveWaitings(customer.id).catch(() => []),
    ]).then(async ([reservations, waitings]) => {
      if (cancelled) return;
      const activeReservations = reservations.filter((r) => r.status !== "CANCELLED");

      const popupIds = [...new Set([...activeReservations.map((r) => r.popupId), ...waitings.map((w) => w.popupId)])];
      const hiddenIds = new Set<number>();
      await Promise.all(
        popupIds.map((popupId) =>
          getPopup(popupId)
            .then((detail) => {
              if (HIDDEN_STATUSES.has(detail.status)) hiddenIds.add(popupId);
            })
            .catch((err) => {
              if (err instanceof ApiError && err.status === 404) hiddenIds.add(popupId);
            })
        )
      );
      if (cancelled) return;

      const visibleReservations = activeReservations.filter((r) => !hiddenIds.has(r.popupId)).length;
      const visibleWaitings = waitings.filter((w) => !hiddenIds.has(w.popupId)).length;
      setCount(visibleReservations + visibleWaitings);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  return count;
}
