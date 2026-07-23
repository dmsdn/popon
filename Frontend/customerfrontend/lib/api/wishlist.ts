// lib/api/wishlist.ts
import { apiFetch } from "./client";

const MOCK_STORAGE_KEY = "mock_wishlist";

// -------------------- localStorage mock (백엔드 미연결/토큰 문제 시 대체) --------------------

function readMockWishlist(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writeMockWishlist(ids: number[]) {
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("찜 목록(mock) 저장 실패", error);
  }
}

async function withMockFallback<T>(realCall: () => Promise<T>, mockCall: () => T): Promise<T> {
  try {
    return await realCall();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[wishlist] 실 API 호출 실패 → mock 데이터로 대체합니다.", error);
      return mockCall();
    }
    throw error;
  }
}

// -------------------- 실 API 우선, 실패 시 mock --------------------

/** 로그인한 고객이 찜한 팝업 id 목록 */
export function getWishlist() {
  return withMockFallback(
    () => apiFetch<number[]>("/api/customer/wishlist"),
    () => readMockWishlist()
  );
}

export function addWishlist(popupId: number) {
  return withMockFallback(
    () =>
      apiFetch<{ success: boolean }>("/api/customer/wishlist", {
        method: "POST",
        body: JSON.stringify({ popupId }),
      }),
    () => {
      const ids = readMockWishlist();
      if (!ids.includes(popupId)) writeMockWishlist([...ids, popupId]);
      return { success: true };
    }
  );
}

export function removeWishlist(popupId: number) {
  return withMockFallback(
    () =>
      apiFetch<{ success: boolean }>(`/api/customer/wishlist/${popupId}`, {
        method: "DELETE",
      }),
    () => {
      writeMockWishlist(readMockWishlist().filter((id) => id !== popupId));
      return { success: true };
    }
  );
}
