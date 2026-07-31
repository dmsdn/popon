"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getMyWaitingStatus,
  cancelWaiting,
  removeMyWaitingId,
  type Waiting,
} from "@/lib/api/waiting";
import { getPopup, type PopupDetail } from "@/lib/api/popups";
import { waitingStatusLabel } from "@/lib/utils/statusLabels";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const POLICY = [
  "순서가 되면 카카오톡으로 알림을 보내드려요. 5분 내 미확인 시 다음 순번으로 넘어갈 수 있어요.",
  "잦은 취소·노쇼는 서비스 이용에 제한이 있을 수 있어요.",
];

export default function WaitingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();

  const [waiting, setWaiting] = useState<Waiting | null>(null);

  // [신규] 대기중/호출됨 상태일 때 입장 처리가 됐는지 몇 초마다 확인해서,
  // 처리되면 QR 대신 "입장 처리 완료" 안내로 자동 전환해요.
  useEffect(() => {
    if (!waiting || (waiting.status !== "WAITING" && waiting.status !== "CALLED")) return;
    const interval = setInterval(() => {
      getMyWaitingStatus(Number(id))
        .then((w) => setWaiting(w))
        .catch((err) => console.error("입장 상태 확인 실패", err));
    }, 4000);
    return () => clearInterval(interval);
  }, [waiting, id]);
  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      router.replace("/login");
      return;
    }
    let cancelled = false;

    getMyWaitingStatus(Number(id))
      .then(async (w) => {
        if (cancelled) return;
        setWaiting(w);
        const p = await getPopup(w.popupId);
        if (cancelled) return;
        setPopup(p);
      })
      .catch((err) => console.error("웨이팅 상세 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, customer, authLoading, router]);

  const handleCancel = async () => {
    if (!waiting || !customer) return;
    if (!confirm("웨이팅을 취소할까요?")) return;
    try {
      const updated = await cancelWaiting(waiting.id, customer.id);
      setWaiting(updated);
      removeMyWaitingId(waiting.id);
      alert("웨이팅이 취소됐어요.");
      router.back();
    } catch (err) {
      console.error("웨이팅 취소 실패", err);
      alert(err instanceof Error ? err.message : "웨이팅 취소에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleShare = async () => {
    if (!popup) return;
    const shareData = {
      title: popup.title,
      text: `${popup.title} 웨이팅 현황을 공유해요.`,
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

  if (loading || authLoading) {
    return <main className="px-6 py-20 text-center text-gray-400">불러오는 중이에요...</main>;
  }

  if (!waiting || !popup) {
    return <main className="px-6 py-20 text-center text-gray-400">웨이팅 정보를 찾을 수 없어요.</main>;
  }

  const isActive = waiting.status === "WAITING";
  const estimatedMinutes =
    isActive && popup.avgExperienceMinutes ? waiting.teamsAhead * popup.avgExperienceMinutes : null;

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
          <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
        </button>
        <h1 className="text-lg font-bold">웨이팅 상세</h1>
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
            <span className="inline-block text-sm text-gray-500 mb-1">{waitingStatusLabel(waiting.status)}</span>
            <p className="text-sm font-semibold">{popup.title}</p>
            <p className="text-sm text-gray-400 mt-0.5">팝업 페이지 보기 ›</p>
          </div>
        </Link>

        <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">내 순번</p>
              <p className="text-3xl font-bold">
                {waiting.teamNumber}
                <span className="text-sm font-normal text-gray-500 ml-0.5">번째</span>
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>앞 {waiting.teamsAhead}팀</p>
              {estimatedMinutes !== null && <p>예상 대기 약 {estimatedMinutes}분</p>}
            </div>
          </div>
          <Row label="인원" value={`${waiting.partySize}명`} />
          {popup.location && <Row label="위치" value={popup.location} />}
          <Row label="등록 시간" value={new Date(waiting.registeredAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} />
        </section>

        {/* [신규] 입장 전(대기중/호출됨)이면 QR을 보여줘요. 입장 완료/취소된
            건은 더 이상 쓸 일이 없으니 숨겨요. */}
        {(waiting.status === "WAITING" || waiting.status === "CALLED") && (
          <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex flex-col items-center">
            <p className="text-sm font-semibold mb-3">입장 QR</p>
            <QRCodeDisplay qrToken={waiting.qrToken} />
          </section>
        )}

        {/* [신규] 방금 입장 처리가 된 경우 QR 대신 완료 안내를 보여줘요. */}
        {waiting.enteredAt && (
          <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex flex-col items-center">
            <div className="w-16 h-16 mb-3 rounded-full bg-point/20 flex items-center justify-center text-point text-3xl">
              ✓
            </div>
            <p className="text-sm font-medium">입장 처리 됐어요. 즐거운 시간 보내세요!</p>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2">이용 안내</h2>
          <ul className="flex flex-col gap-2">
            {POLICY.map((text) => (
              <li key={text} className="text-sm text-gray-500 leading-relaxed">· {text}</li>
            ))}
          </ul>
        </section>

        {isActive && (
          <button type="button" onClick={handleCancel} className="w-full rounded-full py-3 text-base font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300">
            웨이팅 취소
          </button>
        )}

        <button type="button" onClick={handleShare} className="w-full rounded-full py-3 text-base font-medium border border-gray-300 dark:border-[#282B32]">
          함께 갈 친구에게 보내기
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-[#282B32] first:border-t-0 first:pt-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}
