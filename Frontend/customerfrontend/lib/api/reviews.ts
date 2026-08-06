// lib/api/reviews.ts
// 후기 정보를 관리하는 API

// 백엔드 ReviewController(/api/customer/reviews)와 동일한 요청/응답 스키마를 사용
// (ReviewRequest / ReviewResponse 참고: popupId, rating, content, imageUrls / id, likeCount, likedByMe, createdAt, updatedAt)
//
// lib/auth/AuthContext.tsx의 loginAsTestUser / getMyInfo 실패 시 mock 대체 패턴과 동일합니다.

import { apiFetch, ApiError, getToken } from "./client";

export interface Review {
  id: number;
  popupId: number;
  nickname?: string; // [신규] 작성자 닉네임 - 없으면 프론트에서 "방문자"로 대체 표시
  rating: number | null; // 0.5 ~ 5.0, 방문 미인증이면 null
  content: string;
  imageUrls: string[];
  likeCount: number;
  likedByMe: boolean;
  visitDate: string | null; // "YYYY-MM-DD", 다녀간 날짜 (예약/웨이팅 방문 기록에서 자동 채움)
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  ownerToken?: string;   // 목업 데이터에서 리뷰 작성자를 구분하기 위한 내부 값
}

export interface ReviewCreatePayload {
  popupId: number;
  rating?: number; // [수정] 방문 미인증 댓글은 별점 없이
  content: string;
  imageUrls?: string[]; // 최대 5장
  visitDate?: string; // "YYYY-MM-DD", 방문 기록에서 자동으로 채워진 값 (기록 없으면 생략)
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
    visitDate: "2026-07-09",
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
    visitDate: null,
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

function validateRating(rating: number | undefined) {
  // [수정] 방문 미인증 댓글은 rating 자체가 없어 검증을 건너뜀
  if (rating === undefined) return;
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
  const ownerToken = getToken() ?? "anonymous";

  // 백엔드와 동일하게 "내가 이미 이 팝업에 리뷰를 남겼는지"만 체크
  if (reviews.some((r) => r.popupId === payload.popupId && r.ownerToken === ownerToken)) {
    throw new Error("이미 이 팝업에 리뷰를 작성하셨어요.");
  }

  const now = new Date().toISOString();
  const review: Review = {
    id: nextMockId(reviews),
    popupId: payload.popupId,
    rating: payload.rating ?? null,
    content: payload.content,
    imageUrls: payload.imageUrls ?? [],
    likeCount: 0,
    likedByMe: false,
    visitDate: payload.visitDate ?? null,
    createdAt: now,
    updatedAt: now,
    ownerToken,
  };

  writeMockReviews([review, ...reviews]);
  return review;
}

function mockGetMyReviews(): Review[] {
  // [수정] 지금 로그인한 계정(토큰)이 작성한 것만 "내 리뷰"
  const ownerToken = getToken();
  return readMockReviews()
    .filter((r) => r.ownerToken === ownerToken)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function mockGetPopupReviews(popupId: number): Review[] {
  return readMockReviews()
    .filter((r) => r.popupId === popupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function mockUpdateReview(id: number, payload: ReviewCreatePayload): Review {
  validateRating(payload.rating);
  validateImageCount(payload.imageUrls);

  const reviews = readMockReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("리뷰를 찾을 수 없어요.");

  const updated: Review = {
    ...reviews[idx],
    rating: payload.rating ?? null,
    content: payload.content,
    imageUrls: payload.imageUrls ?? [],
    visitDate: payload.visitDate ?? reviews[idx].visitDate,
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

// 개발 중 mock 데이터를 초기 상태로 되돌리고 싶을 때 콘솔 등에서 호출
export function resetMockReviews() {
  writeMockReviews(SEED_REVIEWS);
}

// ISO datetime → 앱에서 쓰는 "26.07.10" 표기로 변환
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
    const isConnectivityIssue = error instanceof ApiError && (error.isNetworkError || (error.status ?? 0) >= 500);
    if (process.env.NODE_ENV === "development" && isConnectivityIssue) {
      console.warn("[reviews] 실 API 호출 실패 → mock 데이터로 대체합니다.", error);
      return mockCall();
    }
    throw error;
  }
}

// 리뷰 작성 
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

// 내가 쓴 리뷰 목록 조회
export function getMyReviews() {
  return withMockFallback(
    () => apiFetch<Review[]>("/api/customer/reviews"),
    () => mockGetMyReviews()
  );
}

// 팝업 상세페이지용 공개 후기 목록
export function getRecentReviews(limit = 10) {
  return withMockFallback(
    () => apiFetch<Review[]>(`/api/customer/reviews/recent?limit=${limit}`),
    () => []
  );
}

// getMyReviews()로 가져온 내 리뷰 id와 겹치는 항목만 "나의 후기"로
export function getPopupReviews(popupId: number, page = 0, size = 20) {
  return withMockFallback(
    () => apiFetch<Review[]>(`/api/customer/reviews/popup/${popupId}?page=${page}&size=${size}`),
    () => mockGetPopupReviews(popupId)
  );
}

// 리뷰 수정
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

// 리뷰 삭제
export function deleteReview(id: number) {
  return withMockFallback(
    () => apiFetch<{ success: boolean }>(`/api/customer/reviews/${id}`, { method: "DELETE" }),
    () => {
      mockDeleteReview(id);
      return { success: true };
    }
  );
}

// 좋아요 누르기
export function likeReview(id: number) {
  return withMockFallback(
    () =>
      apiFetch<LikeResult>(`/api/customer/reviews/${id}/like`, {
        method: "POST",
      }),
    () => mockSetLike(id, true)
  );
}

// 좋아요 취소 
export function unlikeReview(id: number) {
  return withMockFallback(
    () =>
      apiFetch<LikeResult>(`/api/customer/reviews/${id}/like`, {
        method: "DELETE",
      }),
    () => mockSetLike(id, false)
  );
}
