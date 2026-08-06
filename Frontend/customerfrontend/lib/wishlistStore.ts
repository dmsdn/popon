// lib/wishlistStore.ts
// 찜 상태를 여러 화면에서 공유하고 관리하는 전역 저장소
import { getWishlist, addWishlist, removeWishlist } from "@/lib/api/wishlist";
import { getToken } from "@/lib/api/client";

let ids = new Set<number>();
const EMPTY_SET = new Set<number>();
export function getServerWishlistSnapshot() {
  return EMPTY_SET;
}
let loaded = false;
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeWishlist(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWishlistSnapshot() {
  return ids;
}

// 로그인된 상태에서 처음 한 번만 서버에서 찜 목록을 받아옴
export function ensureWishlistLoaded() {
  if (loaded || loadingPromise || !getToken()) return;
  loadingPromise = getWishlist()
    .then((list) => {
      ids = new Set(list);
      loaded = true;
      notify();
    })
    .catch((err) => {
      console.warn("찜 목록 조회 실패", err);
    })
    .finally(() => {
      loadingPromise = null;
    });
}

// 로그아웃/재로그인 시 다시 불러올 수 있도록 초기화
export function resetWishlistStore() {
  ids = new Set();
  loaded = false;
  loadingPromise = null;
  notify();
}

export async function toggleWishlist(popupId: number) {
  const wasWishlisted = ids.has(popupId);
  // 낙관적 업데이트: 서버 응답을 기다리지 않고 화면부터 반영
  const next = new Set(ids);
  if (wasWishlisted) next.delete(popupId);
  else next.add(popupId);
  ids = next;
  notify();

  try {
    if (wasWishlisted) await removeWishlist(popupId);
    else await addWishlist(popupId);
  } catch (err) {
    console.error("찜 변경 실패, 되돌립니다.", err);
    // 실패하면 원래 상태로 되돌림
    const reverted = new Set(ids);
    if (wasWishlisted) reverted.add(popupId);
    else reverted.delete(popupId);
    ids = reverted;
    notify();
  }
}
