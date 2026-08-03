"use client";

// 찜하기 하트 버튼 - 로그인 여부 확인, 낙관적 업데이트로 즉시 토글돼요.

import Image from "next/image";
import { useSyncExternalStore, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  getServerWishlistSnapshot,
  ensureWishlistLoaded,
  toggleWishlist,
} from "@/lib/wishlistStore";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";

export function HeartButton({
  popupId,
  className = "",
  onToggle,
}: {
  popupId: number;
  className?: string;
  /** [신규] 토글 직후(낙관적 업데이트 시점) 새 찜 상태를 알려줘요 - 찜 개수 같은
      숫자를 화면에서 즉시 반영하고 싶을 때 써요. */
  onToggle?: (nextActive: boolean) => void;
}) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const ids = useSyncExternalStore(subscribeWishlist, getWishlistSnapshot, getServerWishlistSnapshot);
  const active = ids.has(popupId);

  useEffect(() => {
    if (isLoggedIn) ensureWishlistLoaded();
  }, [isLoggedIn]);

  return (
    <button
      type="button"
      aria-label={active ? "찜 해제" : "찜하기"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault(); // 카드 전체가 <Link>인 경우 상세페이지로 이동하는 걸 막음
        e.stopPropagation();
        if (!isLoggedIn) {
          saveRedirectTarget(window.location.pathname);
          router.push("/login");
          return;
        }
        onToggle?.(!active);
        toggleWishlist(popupId);
      }}
      className={`flex items-center justify-center w-8 h-8 ${className}`}
    >
      {/* [수정] 직접 그린 SVG 대신 팀에서 주신 실제 하트 아이콘으로 교체
          (heart.svg = 빨간 채움/찜함, heart_N.svg = 회색/기본) */}
      <Image src={active ? "/icons/ui/heart.svg" : "/icons/ui/heart_N.svg"} alt="" width={24} height={24} />
    </button>
  );
}
