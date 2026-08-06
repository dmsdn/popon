// app/popup/[id]/page.tsx
// 팝업 상세 페이지
"use client";

import { use, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { StickyActionBar } from "@/components/popup/StickyActionBar";
import { ReviewCard } from "@/components/popup/ReviewCard";
import { PlaceCard } from "@/components/popup/PlaceCard";
import { PopupSnsLinks } from "@/components/popup/PopupSnsLinks";
import { DEFAULT_USAGE_GUIDE } from "@/lib/usageGuide";
import { OperatingHoursSection } from "@/components/popup/OperatingHoursSection";
import { ReviewImageModal } from "@/components/popup/ReviewImageModal";
import { SimpleMarkdown } from "@/components/ui/SimpleMarkdown";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { useAuth } from "@/lib/auth/AuthContext";
import { ReservationModal } from "@/components/popup/ReservationModal";
import { WaitingModal } from "@/components/popup/WaitingModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getMyReviews, getPopupReviews, toDisplayDate, type Review } from "@/lib/api/reviews";
import {
  getPopup,
  getPopupSlots,
  getPopupLiveStatus,
  getPopupWaitTime,
  searchPopups,
  getQueueBoardCount,
  getPopupImages,
  getPopupWishlistCount,
  logPopupClick,
  type PopupDetail,
  type PopupSlot,
  type PopupLiveStatus,
  type PopupWaitTime,
  type PopupImage,
} from "@/lib/api/popups";
import { getHotPlacesForRegion, type HotPlace } from "@/data/hotplaces";
import { LiveCongestionPanel } from "@/components/popup/LiveCongestion";
import { createReservation, getMyReservations } from "@/lib/api/reservations";
import { registerWaiting, addMyWaitingId, getWaitingBoard, getMyActiveWaitings } from "@/lib/api/waiting";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { recordPopupView } from "@/lib/recentlyViewed";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";
import { toLocalDateString } from "@/lib/utils/formatLocalDate";
import { isTodayClosed, isDateClosed } from "@/lib/utils/operatingHours";
import { StarRatingInput } from "@/components/popup/StarRatingInput";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { type PopupItem, type ReviewItem } from "@/data/mockPopups";
import { EmptyState } from "@/components/ui/EmptyState";
import { appAlert, appChoice } from "@/lib/ui/alertStore";
import { Checkbox } from "@/components/ui/Checkbox";

const TABS = ["정보", "후기"] as const;

export default function PopupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoggedIn, customer } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [similar, setSimilar] = useState<PopupItem[]>([]);

  const [showReservation, setShowReservation] = useState(false);
  const [showMapConfirm, setShowMapConfirm] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [slots, setSlots] = useState<PopupSlot[]>([]);

  // ?action=waiting/reservation 쿼리로 진입 시 해당 모달 자동 오픈 (로그인 시에만)
  useEffect(() => {
    if (!customer) return;
    const action = searchParams.get("action");
    if (action === "waiting") setShowWaiting(true);
    else if (action === "reservation") setShowReservation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);
  // ?tab=review 쿼리로 후기 탭 자동 선택
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(
    searchParams.get("tab") === "review" ? "후기" : "정보"
  );
  const [myReviewsForPopup, setMyReviewsForPopup] = useState<Review[]>([]);
  const [popupReviews, setPopupReviews] = useState<Review[]>([]);
  // 후기 삭제 시 myReviewsForPopup + popupReviews 둘 다 갱신
  const handleDeleteReview = (reviewId: number) => {
    setMyReviewsForPopup((prev) => prev.filter((r) => r.id !== reviewId));
    setPopupReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };
  const [reviewSort, setReviewSort] = useState<"latest" | "recommended">("latest");
  const [photoOnly, setPhotoOnly] = useState(false);
  // 후기 필터 - 전체/인증된 후기/댓글 3단
  const [reviewFilter, setReviewFilter] = useState<"all" | "verified" | "comment">("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [imageModal, setImageModal] = useState<{ reviewIndex: number; photoIndex: number } | null>(null);
  const [detailImagesExpanded, setDetailImagesExpanded] = useState(false);
  const [hotPlaces, setHotPlaces] = useState<HotPlace[]>([]);
  const [liveStatus, setLiveStatus] = useState<PopupLiveStatus | null>(null);
  const [waitTime, setWaitTime] = useState<PopupWaitTime | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [images, setImages] = useState<PopupImage[]>([]);
  // 대표 이미지 캐러셀 - 여러 장 등록 시 전부 표시(기존엔 한 장만 쓰고 나머지 누락)
  const thumbnailImages = useMemo(
    () => images.filter((img) => img.type === "THUMBNAIL"),
    [images]
  );
  const detailImages = useMemo(() => images.filter((img) => img.type === "DETAIL"), [images]);
  const [heroEmblaRef, heroEmblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (!heroEmblaApi) return;
    const onSelect = () => setHeroIndex(heroEmblaApi.selectedScrollSnap());
    heroEmblaApi.on("select", onSelect);
    onSelect();
    return () => {
      heroEmblaApi.off("select", onSelect);
    };
  }, [heroEmblaApi]);
  const [waitingTeams, setWaitingTeams] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | undefined>(undefined);
  // 이미 작성한 경우 안내 모달 표시 여부
  const [showAlreadyReviewedNotice, setShowAlreadyReviewedNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    // id 변경 즉시 popup/리뷰 state 초기화 (다른 팝업 데이터 잔존 방지)
    setPopup(null);
    setMyReviewsForPopup([]);
    setPopupReviews([]);

    getPopup(id)
      .then((data) => {
        if (!cancelled) {
          setPopup(data);
          recordPopupView(data.id);
          // 클릭 로그 기록 (예약 전환율 분모)
          logPopupClick(data.id, customer?.id ?? null);
          // 주변 핫플 - 프론트 로컬 데이터(data/hotplaces.ts) 사용
          setHotPlaces(getHotPlacesForRegion(data.regionName, data.location));
        }
      })
      .catch((err) => {
        console.error("팝업 상세 조회 실패", err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // 찜 개수 조회 (별도 엔드포인트)
    getPopupWishlistCount(id)
      .then((res) => {
        if (!cancelled) setWishlistCount(res.wishlistCount);
      })
      .catch((err) => console.error("찜 개수 조회 실패", err));

    // 팝업 이미지 (주최자가 등록한 실제 이미지)
    getPopupImages(id)
      .then((list) => {
        if (!cancelled) setImages(list);
      })
      .catch((err) => console.error("팝업 이미지 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [id]);

  // SLOT 방식 팝업이면 예약 모달에서 고를 시간대 목록을 미리 받아둠
  useEffect(() => {
    if (!popup || popup.reservationMode !== "SLOT") return;
    let cancelled = false;

    getPopupSlots(popup.id)
      .then((list) => {
        if (!cancelled) setSlots(list);
      })
      .catch((err) => console.error("예약 시간대 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 실시간 혼잡도 - 팝업 정보 아래 있던 사전예약/웨이팅 박스 자리에 대신 보여줌
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    getPopupLiveStatus(popup.id)
      .then((status) => {
        if (!cancelled) setLiveStatus(status);
      })
      .catch((err) => console.error("실시간 혼잡도 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 예상 대기시간 조회
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    getPopupWaitTime(popup.id)
      .then((data) => {
        if (!cancelled) setWaitTime(data);
      })
      .catch((err) => console.error("예상 대기시간 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 통합 대기열 총 인원 (사전예약+현장웨이팅 합산, totalCount만 수신)
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    getQueueBoardCount(popup.id)
      .then((data) => {
        if (!cancelled) setQueueCount(data.totalCount);
      })
      .catch((err) => console.error("통합 대기열 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 대기팀 수 조회 (하단 액션바 "웨이팅" 버튼 표시용)
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    getWaitingBoard(popup.id)
      .then((board) => {
        if (!cancelled) setWaitingTeams(board.totalWaitingTeams);
      })
      .catch((err) => console.error("대기 현황 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 후기 탭: 내가 쓴 리뷰(getMyReviews)와 이 팝업에 달린 전체 후기(getPopupReviews)를 불러와 합침
  // (lib/api/reviews.ts: 실 API 우선 → 실패 시 localStorage mock)
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    getMyReviews()
      .then((all) => {
        if (cancelled) return;
        setMyReviewsForPopup(all.filter((r) => r.popupId === popup.id));
      })
      .catch((err) => {
        console.error("내 리뷰 조회 실패", err);
      });

    // 팝업 전체 후기 조회
    getPopupReviews(popup.id)
      .then((list) => {
        if (!cancelled) setPopupReviews(list);
      })
      .catch((err) => {
        console.error("팝업 후기 목록 조회 실패", err);
      });

    return () => {
      cancelled = true;
    };
  }, [popup]);

  // 비슷한 팝업 - 해시태그/지역 겹침 점수 계산 (백엔드 similar API 없음)
  useEffect(() => {
    if (!popup) return;
    let cancelled = false;

    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (cancelled) return;
        const currentTags = new Set([...(popup.hashtags ?? []), ...(popup.keywordNames ?? [])]);
        const scored = list
          .filter((p) => p.id !== popup.id)
          .map((p) => {
            const tags = new Set([...(p.hashtags ?? []), ...(p.keywordNames ?? [])]);
            let score = 0;
            for (const t of tags) if (currentTags.has(t)) score += 1;
            if (p.regionName && p.regionName === popup.regionName) score += 1;
            return { popup: p, score };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map((s) => s.popup);
        setSimilar(scored.map(toPopupItem));
      })
      .catch((err) => console.error("비슷한 팝업 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [popup]);

  if (loading) {
    return <main className="px-6 py-20 text-center text-gray-400">불러오는 중이에요...</main>;
  }

  if (loadError || !popup) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        팝업 정보를 찾을 수 없어요.
      </main>
    );
  }

  const myReviewsAsItems: ReviewItem[] = myReviewsForPopup.map((r) => ({
    id: `me-${r.id}`,
    reviewId: r.id,
    popupId: String(popup.id),
    popupName: popup.title,
    nickname: "나의 후기",
    content: r.content,
    date: toDisplayDate(r.createdAt),
    rating: r.rating,
    photos: r.imageUrls.length > 0 ? r.imageUrls : undefined,
    likeCount: r.likeCount,
    likedByMe: r.likedByMe,
    isMine: true,
  }));
  const myReviewIds = new Set(myReviewsForPopup.map((r) => r.id));
  // 백엔드 ReviewResponse에 작성자 닉네임이 없어서 "방문자"로만 표시해요. (백엔드 요청사항 참고)
  const otherReviewsAsItems: ReviewItem[] = popupReviews
    .filter((r) => !myReviewIds.has(r.id))
    .map((r) => ({
      id: `pop-${r.id}`,
      reviewId: r.id,
      popupId: String(popup.id),
      popupName: popup.title,
      nickname: r.nickname ?? "방문자",
      content: r.content,
      date: toDisplayDate(r.createdAt),
      rating: r.rating,
      photos: r.imageUrls.length > 0 ? r.imageUrls : undefined,
      likeCount: r.likeCount,
    likedByMe: r.likedByMe,
    }));
  const relatedReviews = [...myReviewsAsItems, ...otherReviewsAsItems];
  // 정렬(최신순/추천순) + 사진 리뷰만 보기 필터
  const visibleReviews = [...relatedReviews]
    .filter((r) => !photoOnly || (r.photos && r.photos.length > 0))
    .filter((r) => {
      if (reviewFilter === "verified") return r.rating != null;
      if (reviewFilter === "comment") return r.rating == null;
      return true;
    })
    .sort((a, b) =>
      reviewSort === "recommended"
        ? (b.likeCount ?? 0) - (a.likeCount ?? 0)
        : b.date.localeCompare(a.date)
    );
  // 평균 별점 - 백엔드 전체 집계값(popup.avgRating) 사용
  const averageRating = popup.avgRating;

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-24">
      {/* 웹 버전 상단바 (모바일은 자체 뒤로가기 줄 + 하단바) */}
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="flex-1">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
      </div>

      {/* 대표 이미지 캐러셀 (450px 고정, 여러 장 시 스와이프) */}
      <div className="relative w-full h-[450px] bg-gray-100 dark:bg-[#282B32] overflow-hidden">
        {thumbnailImages.length > 0 ? (
          <>
            <div className="w-full h-full overflow-hidden" ref={heroEmblaRef}>
              <div className="flex h-full">
                {thumbnailImages.map((img) => (
                  <div key={img.id} className="relative flex-none w-full h-full">
                    <ImageWithFallback src={img.imageUrl} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
            {thumbnailImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {thumbnailImages.map((img, i) => (
                  <span
                    key={img.id}
                    className={`w-1.5 h-1.5 rounded-full ${i === heroIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : detailImages[0] ? (
          <ImageWithFallback src={detailImages[0].imageUrl} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            등록된 이미지가 없어요
          </div>
        )}
      </div>

      <div className="px-4 mobile:px-8 py-6">
        {/* 별점 - 브랜드명 줄 오른쪽 고정 */}
        <div className="flex items-center justify-between mb-2">
          <Link href={`/brand/${popup.businessId}`} className="text-sm text-gray-400 inline-block">
            {popup.companyName} ›
          </Link>
          {averageRating != null && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 flex-none">
              <img src="/icons/ui/star_active.svg" alt="" width={20} height={20} />
              {Number(averageRating).toFixed(1)}/5
            </span>
          )}
        </div>

        {/* 제목 - 폰트 굵기 한 단계 얇게(bold→semibold) */}
        <h1 className="text-3xl font-semibold mb-2">{popup.title}</h1>

        {/* 상태 배지 - 날짜 옆 */}
        <p className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          {new Date(popup.startDate).toLocaleDateString("ko-KR")} ~{" "}
          {new Date(popup.endDate).toLocaleDateString("ko-KR")}
          <StatusBadge status={toPopupItem(popup).status} />
        </p>

        {/* 위치 - 클릭 시 네이버 지도 길찾기 팝업 */}
        {popup.location && (
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setShowMapConfirm((prev) => !prev)}
              className="flex items-center gap-1 text-sm text-gray-500"
            >
              {popup.location}
              <span className="text-gray-400">›</span>
            </button>

            {showMapConfirm && (
              <>
                {/* 배경 클릭 시 닫힘 */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMapConfirm(false)} />
                <div className="absolute left-0 top-full mt-1.5 z-20 bg-white dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] rounded-lg shadow-md p-3 w-64">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  "{popup.location}"으로 길찾기를 시작할까요?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMapConfirm(false)}
                    className="flex-1 text-sm text-gray-500 border border-gray-200 dark:border-[#282B32] rounded-full py-2"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(`https://map.naver.com/p/search/${encodeURIComponent(popup.location!)}`, "_blank");
                      setShowMapConfirm(false);
                    }}
                    className="flex-1 text-sm bg-gray-900 text-white rounded-full py-2"
                  >
                    길찾기
                  </button>
                </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 지역/카테고리/해시태그 - 클릭 시 검색 결과로 이동, undefined 방어 */}
        {(popup.regionName || (popup.keywordNames ?? []).length > 0 || (popup.hashtags ?? []).length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {popup.regionName && (
              <Link
                href={`/search?region=${encodeURIComponent(popup.regionName)}`}
                className="text-sm border border-gray-200 dark:border-[#282B32] rounded-full px-3 py-1 text-gray-600 dark:text-gray-400"
              >
                {popup.regionName}
              </Link>
            )}
            {(popup.keywordNames ?? []).map((name) => (
              <Link
                key={name}
                href={`/search?q=${encodeURIComponent(name)}`}
                className="text-sm border border-gray-200 dark:border-[#282B32] rounded-full px-3 py-1 text-gray-600 dark:text-gray-400"
              >
                {name}
              </Link>
            ))}
            {(popup.hashtags ?? []).map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-sm border border-gray-200 dark:border-[#282B32] rounded-full px-3 py-1 text-gray-600 dark:text-gray-400"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* 혼잡도+예상대기시간 카드, 전화문의 버튼(businessPhone 있을 때만) */}
        <div className="border border-gray-200 dark:border-[#282B32] rounded-lg px-4 py-4 mb-8 flex flex-col gap-4">
          {liveStatus ? (
            <LiveCongestionPanel status={liveStatus} />
          ) : (
            <p className="text-sm text-gray-400">혼잡도 불러오는 중...</p>
          )}

          {waitTime && (
            <div className="pt-4 border-t border-gray-100 dark:border-[#282B32]">
              <p className="text-sm font-semibold mb-1">예상 대기시간</p>
              {waitTime.reservationMode === "FREE" && waitTime.freeModeResult ? (
                <p className="text-sm text-gray-400">
                  지금 방문하면 약 {Math.round(waitTime.freeModeResult.estimatedWaitMinutes)}분 대기 예상
                  (현재 {waitTime.freeModeResult.reservedCount}/{waitTime.freeModeResult.capacity}명)
                </p>
              ) : waitTime.slots && waitTime.slots.length > 0 ? (
                <p className="text-sm text-gray-400">
                  가장 빠른 시간대({waitTime.slots[0].startTime.slice(0, 5)}) 기준 약{" "}
                  {Math.round(waitTime.slots[0].estimatedWaitMinutes)}분 대기 예상
                </p>
              ) : (
                <p className="text-sm text-gray-400">예약 가능한 시간대가 없어요.</p>
              )}
              {queueCount !== null && (
                <p className="text-sm text-gray-400 mt-1">현재 대기·체류 중인 인원 총 {queueCount}명</p>
              )}
            </div>
          )}

          {/* 전화문의 버튼 - 예약/웨이팅 미지원 팝업은 StickyActionBar로 이동 */}
          {(popup.queueMode === "PRERESERVATION_ONLY" ||
            popup.queueMode === "ONSITE_WAITING_ONLY" ||
            popup.queueMode === "BOTH") &&
            popup.businessPhone && (
              <a
                href={`tel:${popup.businessPhone}`}
                className="w-full text-center text-sm font-medium border border-gray-300 dark:border-[#282B32] text-gray-700 dark:text-gray-300 rounded-full py-2.5"
              >
                전화로 문의하기
              </a>
            )}
        </div>

        {showReservation && (
          <ReservationModal
  popupName={popup.title}
  dateRange={`${new Date(popup.startDate).toLocaleDateString("ko-KR")} ~ ${new Date(popup.endDate).toLocaleDateString("ko-KR")}`}
  location={popup.location ?? undefined}
  notice={popup.notice}
  slots={slots}
  minDate={new Date(popup.startDate)}
  maxDate={new Date(popup.endDate)}
  capacity={popup.capacity}
  maxPartySizePerTeam={popup.maxPartySizePerTeam}
  operatingHours={popup.operatingHours}
  onClose={() => setShowReservation(false)}
  onSubmit={async (date, count, slotId, time) => {
              if (!customer) {
                saveRedirectTarget(`/popup/${id}`);
                router.push("/login");
                return;
              }
              // 중복 예약 검사 - 같은 팝업+날짜+시간대만 차단. 휴무일 제출 시 재확인(이중 방어)
              if (isDateClosed(popup.operatingHours, date)) {
                await appAlert("휴무일에는 예약할 수 없어요. 다른 날짜를 선택해주세요.");
                return;
              }
              const targetDateStr = toLocalDateString(date);
              try {
                const myReservations = await getMyReservations(customer.id);
                const duplicate = myReservations.find(
                  (r) =>
                    r.status !== "CANCELLED" &&
                    r.popupId === popup.id &&
                    r.reservationDate === targetDateStr &&
                    (r.reservationTime ?? null) === (time ?? null)
                );
                if (duplicate) {
                  await appAlert("이미 같은 시간대에 예약이 있어요.");
                  return;
                }
              } catch (err) {
                console.error("기존 예약 확인 실패", err);
              }
              try {
                const reservation = await createReservation(customer.id, {
                  popupId: popup.id,
                  ...(popup.reservationMode === "SLOT"
                    ? { slotId }
                    : { reservationDate: targetDateStr, reservationTime: time }),
                  partySize: count,
                });
                setShowReservation(false);
                // 예약 완료 후 상세보기/계속 둘러보기 선택
                const goToDetail = await appChoice(
                  "예약이 완료됐어요!",
                  "예약 확인하기",
                  "계속 둘러보기"
                );
                if (goToDetail) {
                  router.push(`/reservations/${reservation.id}`);
                }
              } catch (err) {
                console.error("예약 실패", err);
                await appAlert(err instanceof Error ? err.message : "예약에 실패했어요. 잠시 후 다시 시도해주세요.");
              }
            }}
          />
        )}

        {showWaiting && (
          <WaitingModal
            popupName={popup.title}
            dateRange={`${new Date(popup.startDate).toLocaleDateString("ko-KR")} ~ ${new Date(popup.endDate).toLocaleDateString("ko-KR")}`}
            location={popup.location ?? undefined}
            notice={popup.notice}
            capacity={popup.capacity}
            maxPartySizePerTeam={popup.maxPartySizePerTeam}
            onClose={() => setShowWaiting(false)}
            onSubmit={async (count) => {
              if (!customer) {
                saveRedirectTarget(`/popup/${id}`);
                router.push("/login");
                return;
              }
              if (!customer.phone) {
                await appAlert("웨이팅 등록에는 전화번호가 필요해요. 마이페이지 > 내 정보에서 먼저 등록해주세요.");
                return;
              }
              // 같은 팝업 중복 웨이팅만 차단 (여러 팝업 동시 대기는 허용)
              try {
                const activeWaitings = await getMyActiveWaitings(customer.id);
                const already = activeWaitings.find((w) => w.popupId === popup.id);
                if (already) {
                  await appAlert("이미 이 팝업에 웨이팅 중이에요.");
                  return;
                }
              } catch (err) {
                console.error("활성 웨이팅 확인 실패", err);
                // 확인 자체가 실패해도 등록은 계속 진행 (막는 게 목적이 아니라 안내가 목적)
              }
              try {
                const waiting = await registerWaiting(popup.id, customer.id, {
                  phoneNumber: customer.phone,
                  partySize: count,
                });
                addMyWaitingId(waiting.id);
                setShowWaiting(false);
                // 등록 성공 직후 대기 현황 재조회 (waitingTeams 배지 즉시 갱신)
                getWaitingBoard(popup.id)
                  .then((board) => setWaitingTeams(board.totalWaitingTeams))
                  .catch((err) => console.error("대기 현황 재조회 실패", err));
                // 등록 완료 안내에 대기번호(teamNumber) 표시
                const goToDetail = await appChoice(
                  `웨이팅 ${waiting.teamNumber}번째로 등록됐어요! (${count}명)`,
                  "웨이팅 확인하기",
                  "계속 둘러보기"
                );
                if (goToDetail) {
                  router.push(`/waiting/${waiting.id}`);
                }
              } catch (err) {
                console.error("웨이팅 등록 실패", err);
                await appAlert(err instanceof Error ? err.message : "웨이팅 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
              }
            }}
          />
        )}

        {imageModal && (
          <ReviewImageModal
            reviews={visibleReviews}
            initialReviewIndex={imageModal.reviewIndex}
            initialPhotoIndex={imageModal.photoIndex}
            onClose={() => setImageModal(null)}
          />
        )}

        {/* 이미 작성한 경우 안내 모달 */}
        {showAlreadyReviewedNotice && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
            onClick={() => setShowAlreadyReviewedNotice(false)}
          >
            <div
              className="bg-white dark:bg-[#282B32] rounded-xl px-6 py-6 w-full max-w-xs text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium mb-6">이미 댓글 / 후기를 남겼습니다.</p>
              <button
                type="button"
                onClick={() => setShowAlreadyReviewedNotice(false)}
                className="w-full rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b border-gray-100 dark:border-[#282B32] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-3 text-sm ${
                activeTab === tab
                  ? "font-semibold border-b-2 border-gray-900 dark:border-white"
                  : "text-gray-400"
              }`}
            >
              {tab === "후기" ? `댓글/후기 (${popup.reviewCount})` : tab}
            </button>
          ))}
        </div>

        {activeTab === "정보" && (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#282B32] [&>*:not(:first-child)]:pt-8">
            {/* SNS/홈페이지 링크 */}
            <PopupSnsLinks links={popup.snsLinks} />

            {/* 요일별 운영시간 */}
            <OperatingHoursSection hours={popup.operatingHours} />

            <section>
              <h2 className="text-sm font-semibold mb-2">소개</h2>
              <SimpleMarkdown text={popup.description} />
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">이용 정보</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                정원 {popup.capacity}명 · 평균 체험 시간 {popup.avgExperienceMinutes}분
                {popup.areaSqm ? ` · ${popup.areaSqm}㎡` : ""}
              </p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">상세 이미지</h2>
              {/* 상세 이미지 - 원본 비율, 200px 접힘+더보기 */}
              {detailImages.length > 0 ? (
                <div className="relative">
                  <div
                    className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                    style={{ maxHeight: detailImagesExpanded ? 999999 : 200 }}
                  >
                    <div className="flex flex-col">
                      {detailImages.map((img) => (
                        <ImageWithFallback key={img.id} src={img.imageUrl} className="w-full h-auto block" />
                      ))}
                    </div>

                    {/* 이용 안내사항 - 상세이미지 펼침 영역 하단, notice 없으면 기본값 */}
                    <section className="px-4 mobile:px-0 py-6">
                      <h2 className="text-sm font-semibold mb-2">이용 안내사항</h2>
                      {popup.notice ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{popup.notice}</p>
                      ) : (
                        <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4 flex flex-col gap-1.5">
                          {DEFAULT_USAGE_GUIDE.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>

                  {!detailImagesExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white dark:to-[#17181a] pointer-events-none" />
                  )}

                  <button
                    type="button"
                    onClick={() => setDetailImagesExpanded((prev) => !prev)}
                    className={`w-full text-center text-sm font-medium text-gray-600 dark:text-white py-2 ${
                      detailImagesExpanded ? "" : "relative -mt-8"
                    }`}
                  >
                    {detailImagesExpanded ? "접기" : "더보기"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">이미지가 없습니다.</p>
              )}
            </section>
          </div>
        )}

        {activeTab === "후기" && (
          <section>
            {/* 후기 작성 유도 카드 - 비로그인도 표시, 별점 클릭 시 로그인으로 */}
            <div className="flex flex-col items-center mb-6">
              {/* 말풍선 모양 안내 카드 */}
              <div className="relative bg-gray-100 dark:bg-[#282B32] rounded-2xl px-5 py-3 animate-float">
                <p className="text-base font-medium text-center">
                  다녀오셨나요? 방문하신 후기를 남겨주세요
                </p>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-100 dark:bg-[#282B32] rotate-45" />
              </div>
              <div className="mt-5">
                <StarRatingInput
                  value={0}
                  onChange={(v) => {
                    if (!customer) {
                      saveRedirectTarget(`/popup/${id}`);
                      router.push("/login");
                      return;
                    }
                    // 이미 작성한 경우 바로 안내
                    if (myReviewsForPopup.length > 0) {
                      setShowAlreadyReviewedNotice(true);
                      return;
                    }
                    router.push(`/popup/${id}/review?rating=${v}`);
                  }}
                  size={48}
                />
              </div>
              {/* 별점 없이 댓글만 작성 (웨이팅/예약 불필요) */}
              <button
                type="button"
                onClick={() => {
                  if (!customer) {
                    saveRedirectTarget(`/popup/${id}`);
                    router.push("/login");
                    return;
                  }
                  // 이미 작성한 경우 바로 안내
                  if (myReviewsForPopup.length > 0) {
                    setShowAlreadyReviewedNotice(true);
                    return;
                  }
                  router.push(`/popup/${id}/review`);
                }}
                className="mt-3 text-sm text-gray-400 underline underline-offset-2"
              >
                방문 안 하셨나요? 댓글만 남기기
              </button>
            </div>

            {relatedReviews.length > 0 && (
              <div className="mb-4">
                {/* 왼쪽: 전체 개수, 오른쪽: 정렬 드롭다운 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">전체 {visibleReviews.length}</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSortMenu((prev) => !prev)}
                      className="flex items-center gap-1 text-sm text-gray-500"
                    >
                      ↑↓ {reviewSort === "latest" ? "최신순" : "추천순"}
                    </button>
                    {showSortMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] rounded-lg shadow-md py-1 w-28">
                          {(["latest", "recommended"] as const).map((sort) => (
                            <button
                              key={sort}
                              type="button"
                              onClick={() => {
                                setReviewSort(sort);
                                setShowSortMenu(false);
                              }}
                              className={`block w-full text-left px-3 py-2 text-sm ${
                                reviewSort === sort ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"
                              }`}
                            >
                              {sort === "latest" ? "최신순" : "추천순"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 왼쪽: 전체/인증된 후기/댓글 필터, 오른쪽: 사진만 보기 체크 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ["all", "전체"],
                        ["verified", "인증된 후기"],
                        ["comment", "댓글"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewFilter(value)}
                        className={`text-sm px-3 py-1.5 rounded-full ${
                          reviewFilter === value
                            ? "border border-point text-[#218B09] font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-gray-500 flex-none ml-2">
                    <Checkbox checked={photoOnly} onChange={() => setPhotoOnly(!photoOnly)} />
                    사진만
                  </label>
                </div>
              </div>
            )}

            {relatedReviews.length === 0 ? (
              <EmptyState message="아직 후기가 없어요." />
            ) : visibleReviews.length === 0 ? (
              // 필터 조합별 빈 상태 문구 분기
              <EmptyState
                message={
                  reviewFilter === "verified"
                    ? photoOnly
                      ? "사진이 있는 인증된 후기가 없어요."
                      : "인증된 후기가 없어요."
                    : reviewFilter === "comment"
                    ? photoOnly
                      ? "사진이 있는 댓글이 없어요."
                      : "댓글이 없어요."
                    : "사진이 있는 후기가 없어요."
                }
              />
            ) : (
              visibleReviews.map((review, i) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onImageClick={(photoIndex) => setImageModal({ reviewIndex: i, photoIndex })}
                  onDelete={handleDeleteReview}
                />
              ))
            )}
          </section>
        )}
      </div>

      {/* 팝업 주변 핫플 - popup_hot_place 테이블 연동 (데이터 없으면 섹션 자체를 숨김) */}
      {hotPlaces.length > 0 && (
        <section className="px-4 mobile:px-8 mb-10">
          <h2 className="text-base font-semibold mb-3">팝업 주변 핫플</h2>
          <HorizontalCarousel>
            {hotPlaces.map((place) => (
              <PlaceCard
                key={place.name}
                category={place.category}
                name={place.name}
                distance={place.distance}
                imageUrl={place.imageUrl}
                href={place.linkUrl}
              />
            ))}
          </HorizontalCarousel>
        </section>
      )}

      {/* 비슷한 팝업 - 진행중인 실제 팝업 중 이 팝업을 뺀 나머지 */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">비슷한 팝업</h2>
        <HorizontalCarousel>
          {similar.map((item) => (
            <PlaceCard
              key={item.id}
              category={item.location ?? "팝업"}
              name={item.name}
              imageUrl={item.imageUrl}
              href={`/popup/${item.id}`}
              internal
            />
          ))}
        </HorizontalCarousel>
      </section>
      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>

      <StickyActionBar
        popupId={popup.id}
        popupStatus={toPopupItem(popup).status}
        queueMode={popup.queueMode}
        reservationMode={popup.reservationMode}
        hasSlots={slots.length > 0}
        waitingTeams={waitingTeams}
        wishlistCount={wishlistCount}
        businessPhone={popup.businessPhone}
        todayClosed={isTodayClosed(popup.operatingHours)}
        onWishlistToggle={(nextActive) => {
          setWishlistCount((prev) => (prev === undefined ? prev : Math.max(0, prev + (nextActive ? 1 : -1))));
        }}
        onReserve={async () => {
          // 로그인 확인 - 모달 열기 전(제출 시점 아님)
          if (!customer) {
          saveRedirectTarget(`/popup/${id}`);
          router.push("/login");
          return;
        }
        // SLOT 모드인데 slots 비어있으면 모달 대신 안내
        if (popup.reservationMode === "SLOT" && slots.length === 0) {
          await appAlert("아직 예약 가능한 시간대가 등록되지 않았어요. 잠시 후 다시 시도해주세요.");
          return;
        }
        setShowReservation(true);
      }}
      onWaiting={() => {
        if (!customer) {
          saveRedirectTarget(`/popup/${id}`);
          router.push("/login");
          return;
        }
        // 휴무일 이중 방어 (disabled 버튼 우회 대비)
        if (isTodayClosed(popup.operatingHours)) {
          appAlert("오늘은 휴무일이라 웨이팅을 등록할 수 없어요.");
          return;
        }
        setShowWaiting(true);
      }}
      />
    </main>
  );
}
