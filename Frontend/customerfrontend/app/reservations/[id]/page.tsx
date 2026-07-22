"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// TODO: 실제로는 id 기준으로 백엔드에서 예약 상세 조회
const mockReservation = {
  id: "r1",
  popupId: "1",
  popupName: "팝업 이름",
  status: "예약확정",
  date: "2026. 07. 16. (목)",
  time: "오후 13:30",
  partySize: 2,
  location: "서울 성동구 위치",
};

const POLICY = [
  "예약 시간 10분 전까지 입장해 주세요. 시간이 지나면 예약이 자동 취소될 수 있어요.",
  "예약 변경 및 취소는 방문 6시간 전까지 무료로 가능해요.",
  "노쇼(방문 미이행)가 반복되면 서비스 이용에 제한이 있을 수 있어요.",
];

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  const router = useRouter();
  const [reservation] = useState(mockReservation);
  const [showQr, setShowQr] = useState(false);

  const handleCancel = () => {
    if (!confirm("예약을 취소할까요?")) return;
    alert("예약이 취소됐어요.");
    router.back();
  };

  const handlePostpone = () => {
    alert("일정 변경 화면은 준비 중이에요.");
  };

  const handleShare = async () => {
    const shareData = {
      title: reservation.popupName,
      text: `${reservation.popupName} 예약 정보를 공유해요.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 공유 취소 시 별도 처리 없음
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("링크가 복사됐어요.");
    }
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
          ‹
        </button>
        <h1 className="text-lg font-bold">예약 상세</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-8">
        <Link href={`/popup/${reservation.popupId}`} className="flex items-center gap-4">
          <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
            이미지
          </div>
          <div>
            <span className="inline-block text-xs text-gray-500 mb-1">{reservation.status}</span>
            <p className="text-sm font-semibold">{reservation.popupName}</p>
            <p className="text-xs text-gray-400 mt-0.5">팝업 페이지 보기 ›</p>
          </div>
        </Link>

        <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold mb-1">예약 정보</h2>
          <Row label="일시" value={`${reservation.date} ${reservation.time}`} />
          <Row label="인원" value={`${reservation.partySize}명`} />
          <Row label="위치" value={reservation.location} />
        </section>

        <button
          type="button"
          onClick={() => setShowQr(true)}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white"
        >
          QR 입장권 보기
        </button>

        <section>
          <h2 className="text-sm font-semibold mb-2">이용 및 환불 안내</h2>
          <ul className="flex flex-col gap-2">
            {POLICY.map((text) => (
              <li key={text} className="text-xs text-gray-500 leading-relaxed">· {text}</li>
            ))}
          </ul>
        </section>

        <div className="flex gap-2">
          <button type="button" onClick={handlePostpone} className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-300">
            일정 변경
          </button>
          <button type="button" onClick={handleCancel} className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700">
            예약 취소
          </button>
        </div>

        <button type="button" onClick={handleShare} className="w-full rounded-full py-3 text-sm font-medium border border-gray-300">
          함께 갈 친구에게 보내기
        </button>
      </div>

      {showQr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-xl px-6 py-8 w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-4">{reservation.popupName}</p>
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