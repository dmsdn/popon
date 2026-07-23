// lib/api/reviews.ts
//
// 백엔드 ReviewController(/api/customer/reviews)와 동일한 요청/응답 스키마를 사용합니다.
// (ReviewRequest / ReviewResponse 참고: popupId, rating, content, imageUrls / id, likeCount, likedByMe, createdAt, updatedAt)
//
// 지금은 실 API를 시도해보고, 실패하면(백엔드 미배포·CORS 등) 개발 모드에서만
// localStorage 기반 mock으로 "진짜로" 저장/조회/수정/삭제/좋아요가 되도록 대체합니다.
// → 새로고침해도 데이터가 남아있어요.
// → 나중에 백엔드가 정상 연동되면 이 파일을 건드릴 필요 없이 자동으로 실 API를 씁니다.
//   (withMockFallback 로직만 지워도 되고, 그냥 둬도 실 API가 성공하는 순간부터는 mock이 안 탑니다)
//
// lib/auth/AuthContext.tsx의 loginAsTestUser / getMyInfo 실패 시 mock 대체 패턴과 동일합니다.

import { apiFetch } from "./client";

export interface Review {
  id: number;
  popupId: number;
  rating: number; // 0.5 ~ 5.0
  content: string;
  imageUrls: string[];
  likeCount: number;
  likedByMe: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface ReviewCreatePayload {
  popupId: number;
  rating: number;
  content: string;
  imageUrls?: string[]; // 최대 5장
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

const MAX_IMAGE_COUNT = 5;
const MOCK_STORAGE_KEY = "mock_reviews";

// -------------------- localStorage mock 저장소 --------------------

const SEED_REVIEWS: Review[] = [
  {
    id: 1,
    popupId: 3,
    rating: 4.5,
    content: "대기는 있었지만 인생샷 건졌어요! 직원분들도 친절하게 안내해주셔서 좋았습니다.",
    imageUrls: [],
    likeCount: 2,
    likedByMe: false,
    createdAt: "2026-07-10T12:00:00",
    updatedAt: "2026-07-10T12:00:00",
  },
  {
    id: 2,
    popupId: 5,
    rating: 5.0,
    content: "아이랑 가기 딱 좋아요. 강추합니다.",
    imageUrls: [],
    likeCount: 5,
    likedByMe: true,
    createdAt: "2026-07-08T09:30:00",
    updatedAt: "2026-07-08T09:30:00",
  },
];

function readMockReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      writeMockReviews(SEED_REVIEWS);
      return SEED_REVIEWS;
    }
    return JSON.parse(raw) as Review[];
  } catch (error) {
    console.error("리뷰 mock 데이터를 읽는 데 실패했어요.", error);
    return [];
  }
}

function writeMockReviews(reviews: Review[]) {
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.error("리뷰 mock 데이터를 저장하는 데 실패했어요.", error);
  }
}

function nextMockId(reviews: Review[]): number {
  return reviews.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function validateRating(rating: number) {
  if (rating < 0.5 || rating > 5) {
    throw new Error("별점은 0.5점에서 5점 사이여야 해요.");
  }
}

function validateImageCount(imageUrls?: string[]) {
  if (imageUrls && imageUrls.length > MAX_IMAGE_COUNT) {
    throw new Error(`사진은 최대 ${MAX_IMAGE_COUNT}장까지 첨부할 수 있어요.`);
  }
}

function mockCreateReview(payload: ReviewCreatePayload): Review {
  validateRating(payload.rating);
  validateImageCount(payload.imageUrls);

  const reviews = readMockReviews();

  // 백엔드와 동일하게 "이미 이 팝업에 리뷰를 남겼는지" 체크합니다.
  if (reviews.some((r) => r.popupId === payload.popupId)) {
    throw new Error("이미 이 팝업에 리뷰를 작성하셨어요.");
  }

  const now = new Date().toISOString();
  const review: Review = {
    id: nextMockId(reviews),
    popupId: payload.popupId,
    rating: payload.rating,
    content: payload.content,
    imageUrls: payload.imageUrls ?? [],
    likeCount: 0,
    likedByMe: false,
    createdAt: now,
    updatedAt: now,
  };

  writeMockReviews([review, ...reviews]);
  return review;
}

function mockGetMyReviews(): Review[] {
  return [...readMockReviews()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mockUpdateReview(id: number, payload: ReviewCreatePayload): Review {
  validateRating(payload.rating);
  validateImageCount(payload.imageUrls);

  const reviews = readMockReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("리뷰를 찾을 수 없어요.");

  const updated: Review = {
    ...reviews[idx],
    rating: payload.rating,
    content: payload.content,
    imageUrls: payload.imageUrls ?? [],
    updatedAt: new Date().toISOString(),
  };
  reviews[idx] = updated;
  writeMockReviews(reviews);
  return updated;
}

function mockDeleteReview(id: number) {
  writeMockReviews(readMockReviews().filter((r) => r.id !== id));
}

function mockSetLike(id: number, liked: boolean): LikeResult {
  const reviews = readMockReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("리뷰를 찾을 수 없어요.");

  const review = reviews[idx];
  if (review.likedByMe === liked) {
    return { liked, likeCount: review.likeCount };
  }

  const nextLikeCount = liked ? review.likeCount + 1 : Math.max(0, review.likeCount - 1);
  reviews[idx] = { ...review, likedByMe: liked, likeCount: nextLikeCount };
  writeMockReviews(reviews);
  return { liked, likeCount: nextLikeCount };
}

/** 개발 중 mock 데이터를 초기 상태로 되돌리고 싶을 때 콘솔 등에서 호출하세요. */
export function resetMockReviews() {
  writeMockReviews(SEED_REVIEWS);
}

/** ISO datetime → 앱에서 쓰는 "26.07.10" 표기로 변환 */
export function toDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

// -------------------- 실 API 우선, 실패 시 mock으로 대체 --------------------

async function withMockFallback<T>(realCall: () => Promise<T>, mockCall: () => T): Promise<T> {
  try {
    return await realCall();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[reviews] 실 API 호출 실패 → mock 데이터로 대체합니다.", error);
      return mockCall();
    }
    throw error;
  }
}

/** 리뷰 작성 */
export function createReview(payload: ReviewCreatePayload) {
  return withMockFallback(
    () =>
      apiFetch<Review>("/api/customer/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => mockCreateReview(payload)
  );
}

/** 내가 쓴 리뷰 목록 조회 */
export function getMyReviews() {
  return withMockFallback(
    () => apiFetch<Review[]>("/api/customer/reviews"),
    () => mockGetMyReviews()
  );
}

/** 리뷰 수정 */
export function updateReview(id: number, payload: ReviewCreatePayload) {
  return withMockFallback(
    () =>
      apiFetch<Review>(`/api/customer/reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    () => mockUpdateReview(id, payload)
  );
}

/** 리뷰 삭제 */
export function deleteReview(id: number) {
  return withMockFallback(
    () => apiFetch<{ success: boolean }>(`/api/customer/reviews/${id}`, { method: "DELETE" }),
    () => {
      mockDeleteReview(id);
      return { success: true };
    }
  );
}

/** 좋아요 누르기 */
export function likeReview(id: number) {
  return withMockFallback(
    () =>
      apiFetch<LikeResult>(`/api/customer/reviews/${id}/like`, {
        method: "POST",
      }),
    () => mockSetLike(id, true)
  );
}

/** 좋아요 취소 */
export function unlikeReview(id: number) {
  return withMockFallback(
    () =>
      apiFetch<LikeResult>(`/api/customer/reviews/${id}/like`, {
        method: "DELETE",
      }),
    () => mockSetLike(id, false)
  );
}
