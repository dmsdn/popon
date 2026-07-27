"use client";

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
import { ReservationModal } from "@/components/popup/ReservationModal";

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
    if (!reservation) return;
    if (!confirm("예약을 취소할까요?")) return;
    try {
      await cancelReservation(reservation.id);
      alert("예약이 취소됐어요.");
      router.back();
    } catch (err) {
      console.error("예약 취소 실패", err);
      // ⚠️ 지금 백엔드는 고객 본인 취소를 허용하지 않아서(사업자 계정만 취소 가능),
      // 이 버튼을 눌러도 실패할 수 있어요. 백엔드에 고객 취소 권한 추가가 필요해요.
      alert("예약 취소에 실패했어요. (지금은 고객이 직접 취소하는 기능이 백엔드에서 아직 지원되지 않아요)");
    }
  };

  const handleShare = async () => {
    if (!popup) return;
    const shareData = {
      title: popup.title,
      text: `${popup.title} 예약 정보를 공유해요.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* 공유 취소 시 별도 처리 없음 */
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("링크가 복사됐어요.");
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
    return reservation.reservationDate ?? "-";
  })();

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
          ‹
        </button>
        <h1 className="text-lg font-bold">예약 상세</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-8">
        <Link href={`/popup/${popup.id}`} className="flex items-center gap-4">
          <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
            이미지
          </div>
          <div>
            <span className="inline-block text-xs text-gray-500 mb-1">
              {STATUS_LABEL[reservation.status] ?? reservation.status}
            </span>
            <p className="text-sm font-semibold">{popup.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">팝업 페이지 보기 ›</p>
          </div>
        </Link>

        <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold mb-1">예약 정보</h2>
          <Row label="일시" value={dateTimeLabel} />
          <Row label="인원" value={`${reservation.partySize}명`} />
          {popup.location && <Row label="위치" value={popup.location} />}
        </section>

        {!isCancelled && (
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white"
          >
            QR 입장권 보기
          </button>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2">이용 안내</h2>
          <ul className="flex flex-col gap-2">
            {POLICY.map((text) => (
              <li key={text} className="text-xs text-gray-500 leading-relaxed">· {text}</li>
            ))}
          </ul>
        </section>

        {!isCancelled && (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowChange(true)}
                className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-300"
              >
                일정 변경
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700"
              >
                예약 취소
              </button>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="w-full rounded-full py-3 text-sm font-medium border border-gray-300"
            >
              함께 갈 친구에게 보내기
            </button>
          </>
        )}
      </div>

      {showQr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-xl px-6 py-8 w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-4">{popup.title}</p>
            <div className="w-40 h-40 mx-auto bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs mb-4">
              QR 코드
            </div>
            <p className="text-xs text-gray-400 mb-6">입장 시 이 QR을 보여주세요.</p>
            <button type="button" onClick={() => setShowQr(false)} className="w-full rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700">
              닫기
            </button>
          </div>
        </div>
      )}

      {showChange && customer && (
        <ReservationModal
          popupName={`${popup.title} - 일정 변경`}
          slots={slots}
          minDate={new Date(popup.startDate)}
          maxDate={new Date(popup.endDate)}
          capacity={popup.capacity}
          onClose={() => setShowChange(false)}
          onSubmit={async (date, count, slotId) => {
            try {
              const updated = await changeReservation(reservation.id, customer.id, {
                ...(popup.reservationMode === "SLOT"
                  ? { newSlotId: slotId }
                  : { newReservationDate: date.toISOString().slice(0, 10) }),
                partySize: count,
              });
              setReservation(updated);
              setShowChange(false);
              alert("예약 일정이 변경됐어요.");
            } catch (err) {
              console.error("예약 변경 실패", err);
              alert(err instanceof Error ? err.message : "예약 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
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
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
