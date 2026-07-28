"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { StickyActionBar } from "@/components/popup/StickyActionBar";
import { ReviewCard } from "@/components/popup/ReviewCard";
import { PlaceCard } from "@/components/popup/PlaceCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { ReservationModal } from "@/components/popup/ReservationModal";
import { WaitingModal } from "@/components/popup/WaitingModal";
import { HeartButton } from "@/components/ui/HeartButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getMyReviews, toDisplayDate, type Review } from "@/lib/api/reviews";
import {
  getPopup,
  getPopupSlots,
  getPopupLiveStatus,
  getPopupWaitTime,
  getQueueBoardCount,
  getPopupImages,
  searchPopups,
  type PopupDetail,
  type PopupSlot,
  type PopupLiveStatus,
  type PopupWaitTime,
  type PopupImage,
} from "@/lib/api/popups";
import { getHotPlacesForRegion, type HotPlace } from "@/data/hotplaces";
import { LiveCongestionPanel } from "@/components/popup/LiveCongestion";
import { createReservation } from "@/lib/api/reservations";
import { registerWaiting, addMyWaitingId, getWaitingBoard } from "@/lib/api/waiting";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { recordPopupView } from "@/lib/recentlyViewed";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";
import { toLocalDateString } from "@/lib/utils/formatLocalDate";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { reviews, type PopupItem, type ReviewItem } from "@/data/mockPopups";

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
  const [showWaiting, setShowWaiting] = useState(false);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  // [수정] 후기 작성 후 돌아올 때 "?tab=review"를 붙여서 보내주면, 새로고침 없이도
  // 곧바로 후기 탭이 선택된 상태로 상세페이지가 열려요.
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(
    searchParams.get("tab") === "review" ? "후기" : "정보"
  );
  const [myReviewsForPopup, setMyReviewsForPopup] = useState<Review[]>([]);
  const [hotPlaces, setHotPlaces] = useState<HotPlace[]>([]);
  const [liveStatus, setLiveStatus] = useState<PopupLiveStatus | null>(null);
  const [waitTime, setWaitTime] = useState<PopupWaitTime | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [images, setImages] = useState<PopupImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [waitingTeams, setWaitingTeams] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    getPopup(id)
      .then((data) => {
        if (!cancelled) {
          setPopup(data);
          recordPopupView(data.id);
          // [수정] 백엔드 API 대신 프론트에 직접 넣어둔 지역별 데이터에서 바로 찾아요
          // (data/hotplaces.ts 참고). 관리자용 업로드 화면이 없는 지금 상황에선
          // 이게 훨씬 빨라요 - SQL 안 만지고 코드에 몇 줄 추가하면 바로 반영돼요.
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

    // 비슷한 팝업 - 진행중인 팝업 중 이 팝업을 뺀 나머지에서 몇 개만
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (!cancelled) {
          setSimilar(list.filter((p) => String(p.id) !== id).slice(0, 4).map(toPopupItem));
        }
      })
      .catch((err) => console.error("비슷한 팝업 조회 실패", err));

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

  // SLOT 방식 팝업이면 예약 모달에서 고를 시간대 목록을 미리 받아둡니다.
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

  // 실시간 혼잡도 - 팝업 정보 아래 있던 사전예약/웨이팅 박스 자리에 대신 보여줍니다.
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

  // [신규] 예상 대기시간 - "지금 가면 대략 N분 대기"를 보여줍니다.
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

  // [신규] 통합 대기열 총 인원 (사전예약자+현장웨이팅자 합산). 개인정보 노출 우려로
  // totalCount만 받아와요 (lib/api/popups.ts 주석 참고).
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

  // [수정] 대기팀 수를 다시 조회합니다 - 이번엔 삭제된 정보 박스가 아니라
  // 하단 고정 액션바의 "웨이팅" 버튼에 표시해요.
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

  // 후기 탭: lib/api/reviews.ts(실 API 우선 → 실패 시 localStorage mock)에서
  // 방금 작성한 리뷰를 불러와, 기존 정적 mock 리뷰 목록과 함께 보여줍니다.
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

  // ⚠️ 공지/혜택/소개/이용정보/SNS 영역은 백엔드 PopupResponse에 없는 필드가 섞여 있어서
  //    지금도 일부는 화면 구조만 맞춘 자리예요. (description, capacity 등은 실제 값입니다)
  const myReviewsAsItems: ReviewItem[] = myReviewsForPopup.map((r) => ({
    id: `me-${r.id}`,
    popupId: String(popup.id),
    popupName: popup.title,
    nickname: "나의 후기",
    content: r.content,
    date: toDisplayDate(r.createdAt),
    rating: r.rating,
    photos: r.imageUrls.length > 0 ? r.imageUrls : undefined,
  }));
  const relatedReviews = [...myReviewsAsItems, ...reviews.filter((r) => r.popupName === popup.title)];

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-24">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          ‹
        </button>
      </div>

      <div className="px-4 mobile:px-8 py-6">
        {/* [수정] "대표 이미지"라는 고정 문구 박스였던 걸 실제 주최자 등록 이미지로 교체.
            popup_image 테이블은 있었는데 조회 API가 없어서 프론트가 절대 못 보여주고
            있었어요 - 백엔드에 GET /api/popups/{popupId}/images 추가하고 연결했습니다. */}
        <div className="relative aspect-[4/5] max-h-[520px] bg-gray-100 rounded-md overflow-hidden mb-5">
          {images.length > 0 ? (
            <ImageWithFallback
              src={images[activeImageIndex].imageUrl}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              등록된 이미지가 없어요
            </div>
          )}
          <HeartButton popupId={popup.id} className="absolute top-3 right-3 w-9 h-9" />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  aria-label={`${i + 1}번째 이미지`}
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full ${i === activeImageIndex ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* [수정] 브랜드명을 브랜드 상세페이지로 연결 - 이전엔 텍스트만 있고 링크가 없었어요 */}
        <Link href={`/brand/${popup.businessId}`} className="text-xs text-gray-400 mb-2 inline-block">
          {popup.companyName} ›
        </Link>

        {/* 제목 + 평점 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={toPopupItem(popup).status} />
            <h1 className="text-xl font-bold">{popup.title}</h1>
          </div>
          {/* TODO: 실제 평점 데이터 연결 */}
          <span className="flex items-center gap-1 text-sm text-gray-500 flex-none">
            <StarRatingDisplay rating={4} size={13} /> 4/5
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {new Date(popup.startDate).toLocaleDateString("ko-KR")} ~{" "}
          {new Date(popup.endDate).toLocaleDateString("ko-KR")}
        </p>

        {/* [수정] 위치가 바로 위 문단과 태그, 두 군데에 중복으로 나오고 있었어요 — 태그 하나로 정리 */}
        {popup.location && (
          <div className="flex gap-2 mb-6">
            <span className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600">
              {popup.location}
            </span>
          </div>
        )}

        {/* [수정] 사전 예약 / 웨이팅 박스 제거 - 실시간 혼잡도 표시로 교체.
            사전예약·웨이팅 기능 자체는 하단 고정 액션바(StickyActionBar)에 그대로 남아있어요. */}
        <div className="mb-8">
          {liveStatus ? (
            <LiveCongestionPanel status={liveStatus} />
          ) : (
            <div className="border border-gray-200 rounded-lg px-4 py-4 text-sm text-gray-400">
              혼잡도 불러오는 중...
            </div>
          )}
        </div>

        {/* [신규] 예상 대기시간 - "지금 가면 대략 N분 대기" */}
        {waitTime && (
          <div className="border border-gray-200 rounded-lg px-4 py-4 mb-8">
            <p className="text-sm font-semibold mb-1">예상 대기시간</p>
            {waitTime.reservationMode === "FREE" && waitTime.freeModeResult ? (
              <p className="text-xs text-gray-400">
                지금 방문하면 약 {Math.round(waitTime.freeModeResult.estimatedWaitMinutes)}분 대기 예상
                (현재 {waitTime.freeModeResult.reservedCount}/{waitTime.freeModeResult.capacity}명)
              </p>
            ) : waitTime.slots && waitTime.slots.length > 0 ? (
              <p className="text-xs text-gray-400">
                가장 빠른 시간대({waitTime.slots[0].startTime.slice(0, 5)}) 기준 약{" "}
                {Math.round(waitTime.slots[0].estimatedWaitMinutes)}분 대기 예상
              </p>
            ) : (
              <p className="text-xs text-gray-400">예약 가능한 시간대가 없어요.</p>
            )}
            {/* 사전예약자+현장웨이팅자를 합친 실제 총 대기/체류 인원 */}
            {queueCount !== null && (
              <p className="text-xs text-gray-400 mt-1">현재 대기·체류 중인 인원 총 {queueCount}명</p>
            )}
          </div>
        )}

        {showReservation && (
          <ReservationModal
  popupName={popup.title}
  slots={slots}
  minDate={new Date(popup.startDate)}
  maxDate={new Date(popup.endDate)}
  capacity={popup.capacity}
  onClose={() => setShowReservation(false)}
  onSubmit={async (date, count, slotId, time) => {
              if (!customer) {
                saveRedirectTarget(`/popup/${id}`);
                router.push("/login");
                return;
              }
              try {
                const reservation = await createReservation(customer.id, {
                  popupId: popup.id,
                  ...(popup.reservationMode === "SLOT"
                    ? { slotId }
                    : { reservationDate: toLocalDateString(date), reservationTime: time }),
                  partySize: count,
                });
                setShowReservation(false);
                router.push(`/reservations/${reservation.id}`);
              } catch (err) {
                console.error("예약 실패", err);
                alert(err instanceof Error ? err.message : "예약에 실패했어요. 잠시 후 다시 시도해주세요.");
              }
            }}
          />
        )}

        {showWaiting && (
          <WaitingModal
            popupName={popup.title}
            onClose={() => setShowWaiting(false)}
            onSubmit={async (count) => {
              if (!customer) {
                saveRedirectTarget(`/popup/${id}`);
                router.push("/login");
                return;
              }
              if (!customer.phone) {
                alert("웨이팅 등록에는 전화번호가 필요해요. 마이페이지 > 내 정보에서 먼저 등록해주세요.");
                return;
              }
              try {
                const waiting = await registerWaiting(popup.id, customer.id, {
                  phoneNumber: customer.phone,
                  partySize: count,
                });
                addMyWaitingId(waiting.id);
                alert(`웨이팅 ${count}명 등록됐어요.`);
                setShowWaiting(false);
              } catch (err) {
                console.error("웨이팅 등록 실패", err);
                alert(err instanceof Error ? err.message : "웨이팅 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
              }
            }}
          />
        )}

        {/* 탭 */}
        <div className="flex border-b border-gray-100 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-3 text-sm ${
                activeTab === tab
                  ? "font-semibold border-b-2 border-gray-900"
                  : "text-gray-400"
              }`}
            >
              {tab === "후기" ? `후기 (${relatedReviews.length})` : tab}
            </button>
          ))}
        </div>

        {activeTab === "정보" && (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="text-sm font-semibold mb-2">공지사항</h2>
              {/* TODO: 실제 공지 데이터 연결 */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                운영 시작 시간은 현장 상황에 따라 변경될 수 있습니다.
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">혜택</h2>
              {/* TODO: 실제 혜택 데이터 연결 */}
              <p className="text-sm text-gray-400">등록된 혜택이 없어요.</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">소개</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{popup.description}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">이용 정보</h2>
              <p className="text-sm text-gray-600">
                정원 {popup.capacity}명 · 평균 체험 시간 {popup.avgExperienceMinutes}분
                {popup.areaSqm ? ` · ${popup.areaSqm}㎡` : ""}
              </p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">SNS / 홈페이지</h2>
              {/* TODO: 실제 SNS/홈페이지 링크 연결 */}
              <div className="bg-gray-900 rounded-md h-[180px] flex items-center justify-center text-white text-sm">
                WELCOME 이미지 영역
              </div>
              <button type="button" className="w-full text-center text-sm text-gray-500 mt-3 py-2">
                모두 보기 ⌄
              </button>
            </section>
          </div>
        )}

        {activeTab === "후기" && (
          <section>
            {isLoggedIn && (
              <Link
                href={`/popup/${id}/review`}
                className="block w-full text-center rounded-full py-3 text-sm font-medium bg-gray-900 text-white mb-4"
              >
                후기 작성하기
              </Link>
            )}
            {relatedReviews.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">아직 후기가 없어요.</p>
            ) : (
              relatedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </section>
        )}
      </div>

      {/* 팝업 주변 핫플 - popup_hot_place 테이블 연동 (데이터 없으면 섹션 자체를 숨김) */}
      {hotPlaces.length > 0 && (
        <section className="px-4 mobile:px-8 mb-10">
          <h2 className="text-base font-semibold mb-3">팝업 주변 핫플</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
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
          </div>
        </section>
      )}

      {/* 비슷한 팝업 - 진행중인 실제 팝업 중 이 팝업을 뺀 나머지 */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">비슷한 팝업</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {similar.map((item) => (
            <PlaceCard key={item.id} category={item.location ?? "팝업"} name={item.name} />
          ))}
        </div>
      </section>

      <Footer />

      <StickyActionBar
        popupId={popup.id}
        waitingTeams={waitingTeams}
        onReserve={() => setShowReservation(true)}
        onWaiting={() => setShowWaiting(true)}
      />
    </main>
  );
}
