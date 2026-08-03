// lib/useUnreadNotificationCount.ts
//
// [신규] 상단바/하단바 알림 아이콘에 안 읽은 개수를 빨간 배지로 보여주기 위한
// 공용 훅이에요.
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getNotifications } from "@/lib/api/notifications";

export function useUnreadNotificationCount() {
  const { customer, isLoggedIn } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !customer) {
      setCount(0);
      return;
    }
    let cancelled = false;
    getNotifications(customer.id)
      .then((list) => {
        if (!cancelled) setCount(list.filter((n) => !n.read).length);
      })
      .catch((err) => console.error("알림 목록 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  return count;
}
