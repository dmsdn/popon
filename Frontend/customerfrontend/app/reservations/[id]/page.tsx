"use client";

// 예약 상세 페이지 - QR 확인, 일정 변경, 취소를 여기서 처리해요.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getMyReservationById,
  changeReservation,
  cancelReservation,
  type Reservation,
} from "@/lib/api/reservations";
import { getPopup, getPopupSlots, type PopupDetail, type PopupSlot } from "@/lib/api/popups";
import { toLocalDateString } from "@/lib/utils/formatLocalDate";
import { ReservationModal } from "@/components/popup/ReservationModal";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { appAlert, appConfirm } from "@/lib/ui/alertStore";

const POLICY = [
  "예약 시간 10분 전까지 입장해 주세요. 시간이 지나면 예약이 자동 취소될 수 있어요.",
  "노쇼(방문 미이행)가 반복되면 서비스 이용에 제한이 있을 수 있어요.",
];

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "예약확정",
  CANCELLED: "취소됨",
};

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  // [신규] QR 모달이 열려있는 동안 입장(체크인) 처리가 됐는지 몇 초마다
  // 확인해서, 처리되면 QR 대신 "입장 처리 완료" 안내로 자동 전환해요.
  useEffect(() => {
    if (!showQr || !customer || reservation?.entryStatus === "CHECKED_IN") return;
    const interval = setInterval(() => {
      getMyReservationById(customer.id, Number(id))
        .then((r) => setReservation(r))
        .catch((err) => console.error("입장 상태 확인 실패", err));
    }, 4000);
    return () => clearInterval(interval);
  }, [showQr, customer, id, reservation?.entryStatus]);
  const [showChange, setShowChange] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      router.replace("/login");
      return;
    }
    let cancelled = false;

    getMyReservationById(customer.id, Number(id))
      .then(async (r) => {
        if (cancelled) return;
        setReservation(r);
        const p = await getPopup(r.popupId);
        if (cancelled) return;
        setPopup(p);
        if (p.reservationMode === "SLOT") {
          const slotList = await getPopupSlots(r.popupId);
          if (!cancelled) setSlots(slotList);
        }
      })
      .catch((err) => console.error("예약 상세 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, customer, authLoading, router]);

  const handleCancel = async () => {
    if (!reservation || !customer) return;
    if (!(await appConfirm("예약을 취소할까요?"))) return;
    try {
      await cancelReservation(reservation.id, customer.id);
      await appAlert("예약이 취소됐어요.");
      router.back();
    } catch (err) {
      console.error("예약 취소 실패", err);
      await appAlert(err instanceof Error ? err.message : "예약 취소에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleShare = async () => {
    if (!popup) return;
    // [수정] window.location.href(지금 보고 있는 "내 예약 상세" 페이지 주소)를
    // 그대로 공유하고 있었어요 - 이 페이지는 로그인한 본인 예약만 볼 수 있는
    // 개인 페이지라, 친구가 링크를 눌러도 로그인 화면이나 "정보를 찾을 수
    // 없어요"만 보게 돼요. 친구가 실제로 볼 수 있는 팝업 공개 상세페이지
    // 주소로 바꿨어요.
    const shareData = {
      title: popup.title,
      text: `${popup.title} 같이 갈래?`,
      url: `${window.location.origin}/popup/${popup.id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* 공유 취소 시 별도 처리 없음 */
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      await appAlert("링크가 복사됐어요.");
    }
  };

  if (loading || authLoading) {
    return <main className="px-6 py-20 text-center text-gray-400">불러오는 중이에요...</main>;
  }

  if (!reservation || !popup) {
    return <main className="px-6 py-20 text-center text-gray-400">예약 정보를 찾을 수 없어요.</main>;
  }

  const isCancelled = reservation.status === "CANCELLED";
  const dateTimeLabel = (() => {
    if (reservation.slotId) {
      const slot = slots.find((s) => s.id === reservation.slotId);
      return slot ? `${slot.slotDate} ${slot.startTime.slice(0, 5)}` : "시간대 예약";
    }
    if (!reservation.reservationDate) return "-";
    // [수정] reservationTime을 안 붙이고 있었어요 - 백엔드에 시간 컬럼을 새로 추가한 값이라
    // 이 부분도 같이 고쳐야 실제로 시간이 화면에 보여요.
    return reservation.reservationTime
      ? `${reservation.reservationDate} ${reservation.reservationTime.slice(0, 5)}`
      : reservation.reservationDate;
  })();

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">예약 상세</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-8">
        <Link href={`/popup/${popup.id}`} className="flex items-center gap-4">
          <div className="w-24 h-24 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
            {popup.thumbnailImages?.[0] ? (
              <ImageWithFallback src={popup.thumbnailImages[0]} className="w-full h-full object-cover" />
            ) : (
              "이미지"
            )}
          </div>
          <div>
            <span className="inline-block text-sm text-gray-500 mb-1">
              {STATUS_LABEL[reservation.status] ?? reservation.status}
            </span>
            <p className="text-sm font-semibold">{popup.title}</p>
            <p className="text-sm text-gray-400 mt-0.5">팝업 페이지 보기 ›</p>
          </div>
        </Link>

        <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold mb-1">예약 정보</h2>
          <Row label="일시" value={dateTimeLabel} />
          <Row label="인원" value={`${reservation.partySize}명`} />
          {popup.location && <Row label="위치" value={popup.location} />}
        </section>

        {!isCancelled && (
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900 dark:text-white"
          >
            QR 입장권 보기
          </button>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2">이용 안내</h2>
          <ul className="flex flex-col gap-2">
            {POLICY.map((text) => (
              <li key={text} className="text-sm text-gray-500 leading-relaxed">· {text}</li>
            ))}
          </ul>
        </section>

        {!isCancelled && (
          <>
            {/* [수정] 혼자 예약한 경우엔 "같이 갈 친구"가 없으니 이 버튼 자체를
                숨겨요. [수정] 취소/일정변경보다 위, 즉 더 먼저 보이는 위치로
                옮겼어요. */}
            {reservation.partySize > 1 && (
              <button
                type="button"
                onClick={handleShare}
                className="w-full rounded-full py-3 text-base font-medium border border-gray-300 dark:border-[#282B32]"
              >
                함께 갈 친구에게 보내기
              </button>
            )}

            {/* [수정] 예약 취소를 왼쪽, 일정 변경을 오른쪽으로 순서를 바꿨어요. */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-full py-3 text-base font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300"
              >
                예약 취소
              </button>
              <button
                type="button"
                onClick={() => setShowChange(true)}
                className="flex-1 rounded-full py-3 text-base font-medium border border-gray-300 dark:border-[#282B32]"
              >
                일정 변경
              </button>
            </div>
          </>
        )}
      </div>

      {showQr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50" onClick={() => setShowQr(false)}>
          <div className="bg-white dark:bg-[#282B32] rounded-xl px-6 py-8 w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-4">{popup.title}</p>
            {reservation.entryStatus === "CHECKED_IN" ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-point flex items-center justify-center text-point text-3xl">
                  ✓
                </div>
                <p className="text-sm font-medium mb-6">입장 처리 됐어요. 즐거운 시간 보내세요!</p>
              </>
            ) : (
              // [수정] 예약 날짜 전엔 QR을 못 보게 막았었는데, 요청으로 다시
              // 언제든(입장 처리 전까지) 볼 수 있게 열었어요.
              <>
                <div className="flex justify-center mb-4">
                  <QRCodeDisplay qrToken={reservation.qrToken} />
                </div>
                <p className="text-sm text-gray-400 mb-6">입장 시 이 QR을 보여주세요.</p>
              </>
            )}
            <button type="button" onClick={() => setShowQr(false)} className="w-full rounded-full py-3 text-sm font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300">
              닫기
            </button>
          </div>
        </div>
      )}

      {showChange && customer && (
        <ReservationModal
          popupName={`${popup.title} - 일정 변경`}
          dateRange={`${new Date(popup.startDate).toLocaleDateString("ko-KR")} ~ ${new Date(popup.endDate).toLocaleDateString("ko-KR")}`}
          location={popup.location ?? undefined}
          notice={popup.notice}
          mode="change"
          slots={slots}
          minDate={new Date(popup.startDate)}
          maxDate={new Date(popup.endDate)}
          capacity={popup.capacity}
          onClose={() => setShowChange(false)}
          onSubmit={async (date, count, slotId, time) => {
            try {
              const updated = await changeReservation(reservation.id, customer.id, {
                ...(popup.reservationMode === "SLOT"
                  ? { newSlotId: slotId }
                  : { newReservationDate: toLocalDateString(date), newReservationTime: time }),
                partySize: count,
              });
              setReservation(updated);
              setShowChange(false);
              await appAlert("예약 일정이 변경됐어요.");
            } catch (err) {
              console.error("예약 변경 실패", err);
              await appAlert(err instanceof Error ? err.message : "예약 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
            }
          }}
        />
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}
