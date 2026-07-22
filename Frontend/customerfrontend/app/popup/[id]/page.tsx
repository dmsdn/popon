// app/popup/[id]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ReviewCard } from "@/components/popup/ReviewCard";
import { PlaceCard } from "@/components/popup/PlaceCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { ReservationModal } from "@/components/popup/ReservationModal";
import { WaitingModal } from "@/components/popup/WaitingModal";
import { getPopup, getPopupSlots, type PopupDetail, type PopupSlot } from "@/lib/api/popups";
import { createReservation } from "@/lib/api/reservations";
import { registerWaiting, setActiveWaitingId } from "@/lib/api/waiting";
import { getMyReviews, toDisplayDate, type Review } from "@/lib/api/reviews";
import { RESERVATION_MODE, POPUP_STATUS_LABEL } from "@/lib/constants/status";
import { recentPopups, popularPopups } from "@/data/mockPopups";
import type { ReviewItem } from "@/data/mockPopups";

const TABS = ["정보", "굿즈", "후기"] as const;

export default function PopupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoggedIn, customer } = useAuth();
  const router = useRouter();

  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [showReservation, setShowReservation] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("정보");
  const [myReviewsForPopup, setMyReviewsForPopup] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getPopup(id);
        if (cancelled) return;
        setPopup(data);

        // SLOT 모드 팝업이면 예약 가능한 시간대 목록도 같이 받아둠
        if (data.reservationMode === RESERVATION_MODE.SLOT) {
          const slotList = await getPopupSlots(id);
          if (!cancelled) setSlots(slotList);
        }
      } catch (err) {
        console.error("팝업 상세 조회 실패", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 후기 탭: lib/api/reviews.ts(실 API 우선 → 실패 시 localStorage mock)에서
  // 내가 쓴 리뷰를 불러와 이 팝업(popupId) 것만 걸러서 보여줍니다.
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

  // 내가 이 팝업에 쓴 리뷰들 (lib/api/reviews.ts) → ReviewCard가 쓰는 표시용 형태로 변환
  const relatedReviews: ReviewItem[] = myReviewsForPopup.map((r) => ({
    id: String(r.id),
    popupName: popup.title,
    nickname: customer?.nickname ?? "나의 후기",
    content: r.content,
    date: toDisplayDate(r.createdAt),
    rating: r.rating,
    photos: r.imageUrls.length > 0 ? r.imageUrls : undefined,
  }));

  const handleReservationSubmit = async (date: Date, count: number, slotId?: number) => {
    if (!customer) return;
    try {
      await createReservation(customer.id, {
        popupId: popup.id,
        partySize: count,
        ...(popup.reservationMode === RESERVATION_MODE.SLOT
          ? { slotId }
          : { reservationDate: date.toISOString().slice(0, 10) }),
      });
      alert(`${date.getMonth() + 1}월 ${date.getDate()}일 ${count}인 예약이 접수됐어요.`);
      setShowReservation(false);
      router.push("/reservations");
    } catch (err) {
      console.error("예약 실패", err);
      alert("예약에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleWaitingSubmit = async (count: number) => {
    if (!customer) return;
    try {
      const waiting = await registerWaiting(
        popup.id,
        { phoneNumber: customer.phone ?? "", partySize: count },
        customer.id
      );
      setActiveWaitingId(waiting.id);
      alert(`웨이팅 ${count}명 등록됐어요.`);
      setShowWaiting(false);
      router.push("/reservations");
    } catch (err) {
      console.error("웨이팅 등록 실패", err);
      alert("웨이팅 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
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
        {/* 대표 이미지 - TODO: 실제 이미지 업로드 데이터 연결 */}
        <div className="aspect-[4/5] max-h-[520px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm mb-5">
          대표 이미지
        </div>

        <p className="text-xs text-gray-400 mb-2">{popup.companyName}</p>

        {/* 제목 + 상태 */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold">{popup.title}</h1>
          {/* TODO: 실제 평점 데이터 연결 */}
          <span className="text-sm text-gray-500 flex-none">★★★★★ 4/5</span>
        </div>

        <p className="text-sm text-gray-500">
          {new Date(popup.startDate).toLocaleDateString("ko-KR")} ~{" "}
          {new Date(popup.endDate).toLocaleDateString("ko-KR")}
        </p>
        {popup.location && <p className="text-sm text-gray-500 mb-3">{popup.location}</p>}

        <div className="flex gap-2 mb-6">
          <span className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600">
            {POPUP_STATUS_LABEL[popup.status]}
          </span>
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
            <p className="text-sm font-semibold mb-1">사전 예약</p>
            <p className="text-xs text-gray-400">
              [Event] 사전 예약 시 소정의 상품을 증정해드립니다 &gt;
            </p>
          </button>
          <button
            type="button"
            onClick={() => setShowWaiting(true)}
            className="text-left border border-gray-200 rounded-lg px-4 py-3"
          >
            <p className="text-sm font-semibold mb-1">웨이팅</p>
            <p className="text-xs text-gray-400">
              [Event] 사전 예약 시 소정의 상품을 증정해드립니다 &gt;
            </p>
          </button>
        </div>

        {showReservation && (
          <ReservationModal
            popupName={popup.title}
            reservationMode={popup.reservationMode}
            slots={slots}
            onClose={() => setShowReservation(false)}
            onSubmit={handleReservationSubmit}
          />
        )}

        {showWaiting && (
          <WaitingModal
            popupName={popup.title}
            onClose={() => setShowWaiting(false)}
            onSubmit={handleWaitingSubmit}
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
              <div className="bg-gray-900 rounded-xl h-[180px] flex items-center justify-center text-white text-sm">
                WELCOME 이미지 영역
              </div>
              <button type="button" className="w-full text-center text-sm text-gray-500 mt-3 py-2">
                모두 보기 ⌄
              </button>
            </section>
          </div>
        )}

        {activeTab === "굿즈" && (
          <p className="text-sm text-gray-400 py-10 text-center">등록된 굿즈가 없어요.</p>
        )}

        {activeTab === "후기" && (
  <section>
    {isLoggedIn && (
      <Link
        href={`/popup/${id}/review`}
        className="block w-full text-center rounded-full py-3 text-sm font-medium bg-[#FEE500] mb-4"
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

      {/* 비슷한 팝업 - TODO: 실제 추천 로직 연결 (지금은 mock 목록에서 이름만 다른 것 노출) */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">비슷한 팝업</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[...recentPopups, ...popularPopups]
            .filter((item) => item.name !== popup.title)
            .slice(0, 4)
            .map((item) => (
              <PlaceCard key={item.id + item.name} category={item.location ?? "팝업"} name={item.name} />
            ))}
        </div>
      </section>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}