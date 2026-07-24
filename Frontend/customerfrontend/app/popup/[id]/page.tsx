"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { getPopup, getPopupSlots, searchPopups, type PopupDetail, type PopupSlot } from "@/lib/api/popups";
import { createReservation } from "@/lib/api/reservations";
import { registerWaiting, addMyWaitingId, getWaitingBoard } from "@/lib/api/waiting";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { recordPopupView } from "@/lib/recentlyViewed";
import { reviews, type PopupItem, type ReviewItem } from "@/data/mockPopups";

const TABS = ["정보", "후기"] as const;

export default function PopupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoggedIn, customer } = useAuth();
  const router = useRouter();

  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [similar, setSimilar] = useState<PopupItem[]>([]);

  const [showReservation, setShowReservation] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [waitingTeams, setWaitingTeams] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("정보");
  const [myReviewsForPopup, setMyReviewsForPopup] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    getPopup(id)
      .then((data) => {
        if (!cancelled) {
          setPopup(data);
          recordPopupView(data.id);
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

  // 웨이팅 박스에 "현재 N팀 대기중" 표시용
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
        {/* 대표 이미지 */}
        <div className="relative aspect-[4/5] max-h-[520px] bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm mb-5">
          대표 이미지
          <HeartButton popupId={popup.id} className="absolute top-3 right-3 w-9 h-9" />
        </div>

        <p className="text-xs text-gray-400 mb-2">{popup.companyName}</p>

        {/* 제목 + 평점 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={toPopupItem(popup).status} />
            <h1 className="text-xl font-bold">{popup.title}</h1>
          </div>
          {/* TODO: 실제 평점 데이터 연결 */}
          <span className="text-sm text-gray-500 flex-none">★★★★★ 4/5</span>
        </div>

        <p className="text-sm text-gray-500">
          {new Date(popup.startDate).toLocaleDateString("ko-KR")} ~{" "}
          {new Date(popup.endDate).toLocaleDateString("ko-KR")}
        </p>
        {popup.location && <p className="text-sm text-gray-500 mb-3">{popup.location}</p>}

        <div className="flex gap-2 mb-6">
          {popup.location && (
            <span className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600">
              {popup.location}
            </span>
          )}
        </div>

        {/* 사전 예약 / 웨이팅 박스 */}
        <div className="flex flex-col gap-3 mb-8">
          <button
            type="button"
            onClick={() => setShowReservation(true)}
            className="text-left border border-gray-200 rounded-lg px-4 py-3"
          >
            <p className="text-sm font-semibold">사전 예약</p>
          </button>
          <button
            type="button"
            onClick={() => setShowWaiting(true)}
            className="text-left border border-gray-200 rounded-lg px-4 py-3"
          >
            <p className="text-sm font-semibold mb-1">웨이팅</p>
            <p className="text-xs text-gray-400">
              {waitingTeams === null ? "대기 현황 불러오는 중..." : `현재 ${waitingTeams}팀 대기중입니다`}
            </p>
          </button>
        </div>

        {showReservation && (
          <ReservationModal
  popupName={popup.title}
  slots={slots}
  minDate={new Date(popup.startDate)}
  maxDate={new Date(popup.endDate)}
  capacity={popup.capacity}
  onClose={() => setShowReservation(false)}
  onSubmit={async (date, count, slotId) => {
              if (!customer) {
                router.push("/login");
                return;
              }
              try {
                const reservation = await createReservation(customer.id, {
                  popupId: popup.id,
                  ...(popup.reservationMode === "SLOT"
                    ? { slotId }
                    : { reservationDate: date.toISOString().slice(0, 10) }),
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

      {/* 팝업 주변 핫플 - TODO: 실제 주변 장소 데이터 연결 */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">팝업 주변 핫플</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <PlaceCard category="카페" name="프롤라" distance="114m" />
          <PlaceCard category="패션잡화" name="뉴뉴 성수점" distance="89m" />
          <PlaceCard category="카페" name="대림창고갤러리" distance="407m" />
          <PlaceCard category="음식점" name="옥수동 화덕피자 성수" distance="240m" />
        </div>
      </section>

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
        onReserve={() => setShowReservation(true)}
        onWaiting={() => setShowWaiting(true)}
      />
    </main>
  );
}
