// lib/useActiveQueueCount.ts
//
// [신규] 상단바/하단바의 "예약/웨이팅" 아이콘에 몇 개나 활성 상태인지 말풍선
// 배지로 보여주기 위한 공용 훅이에요. 취소된 예약, 이미 끝난 웨이팅은 세지 않고
// "지금 살아있는" 것만 세요.
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyReservations } from "@/lib/api/reservations";
import { getMyActiveWaitings } from "@/lib/api/waiting";
import { getPopup, HIDDEN_STATUSES } from "@/lib/api/popups";

export function useActiveQueueCount() {
  const { customer, isLoggedIn } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !customer) {
      setCount(0);
      return;
    }
    let cancelled = false;

    // [수정 8/5] getMyWaitingIds()(이 브라우저 localStorage에 기록해둔 id만
    // 조회)를 쓰고 있었는데, 다른 기기/브라우저에서 등록한 웨이팅은 이
    // 브라우저에 기록이 없어서 개수에서 통째로 빠졌어요. 백엔드에 이미 있는
    // "내 활성 웨이팅 전체" API(GET /api/waiting/me)로 바꿔서, 어느 기기에서
    // 등록했든 정확한 개수가 나오게 했어요.
    Promise.all([
      getMyReservations(customer.id).catch(() => []),
      getMyActiveWaitings(customer.id).catch(() => []),
    ]).then(async ([reservations, waitings]) => {
      if (cancelled) return;
      const activeReservations = reservations.filter((r) => r.status !== "CANCELLED");

      // [수정 8/5] 마이페이지 배지("찜 N", "웨이팅·예약 N")는 게시중지/승인대기/
      // 반려된 팝업을 개수에서 빼도록 이미 고쳤는데, 이 하단바 배지는 그 필터가
      // 없어서 마이페이지에 들어가서 보는 숫자보다 여기 숫자가 더 크게 뜨는
      // 불일치가 있었어요. 활성 예약/웨이팅에 걸린 팝업들의 상태를 조회해서
      // 마이페이지와 똑같은 기준으로 맞춰요.
      const popupIds = [...new Set([...activeReservations.map((r) => r.popupId), ...waitings.map((w) => w.popupId)])];
      const hiddenIds = new Set<number>();
      await Promise.all(
        popupIds.map((popupId) =>
          getPopup(popupId)
            .then((detail) => {
              if (HIDDEN_STATUSES.has(detail.status)) hiddenIds.add(popupId);
            })
            .catch(() => {
              /* 팝업이 삭제됐을 수도 있어요 - 이 경우는 숨기지 않고 그대로 세요 */
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
