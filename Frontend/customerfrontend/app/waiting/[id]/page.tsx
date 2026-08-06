// app/waiting/[id]/page.tsx
// 웨이팅 상세 페이지 - 대기 순번, QR, 취소
"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { appAlert, appConfirm } from "@/lib/ui/alertStore";

const POLICY = [
  "순서가 되면 팝온으로 알림을 보내드려요. 미입장시 노쇼처리가 될 수 있으니 빠른 입장 부탁드려요.",
  "잦은 취소·노쇼는 서비스 이용에 제한이 있을 수 있어요.",
];

export default function WaitingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();

  const [waiting, setWaiting] = useState<Waiting | null>(null);
  // 내 차례 감지(화면 보는 동안만) - 폴링 값 변화 순간 포착, 진동+알림
  const prevTeamsAheadRef = useRef<number | null>(null);
  useEffect(() => {
    if (!waiting || waiting.status !== "WAITING") return;
    const prev = prevTeamsAheadRef.current;
    prevTeamsAheadRef.current = waiting.teamsAhead;
    if (prev !== null && prev > 0 && waiting.teamsAhead === 0) {
      // 진동으로도 알려줌 - 지원 안 하는 기기/브라우저면 조용히 무시
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
      appAlert("다음 차례예요! 곧 입장하실 수 있어요.");
    }
  }, [waiting]);

  // 입장 처리 여부 폴링 (4초 주기)
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
    if (!(await appConfirm("웨이팅을 취소할까요?"))) return;
    try {
      const updated = await cancelWaiting(waiting.id, customer.id);
      setWaiting(updated);
      removeMyWaitingId(waiting.id);
      await appAlert("웨이팅이 취소됐어요.");
      router.back();
    } catch (err) {
      console.error("웨이팅 취소 실패", err);
      await appAlert(err instanceof Error ? err.message : "웨이팅 취소에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleShare = async () => {
    if (!popup) return;
    // 공유 링크 - 팝업 공개 페이지(내 웨이팅 상세 아님)
    const shareData = {
      title: popup.title,
      text: `${popup.title} 같이 갈래?`,
      url: `${window.location.origin}/popup/${popup.id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 공유 취소 시 별도 처리 없음
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      await appAlert("링크가 복사됐어요.");
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
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
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
              <p className="text-4xl font-semibold">
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

        {/* 입장 QR - 대기중/호출됨 상태 모두 표시 */}
        {(waiting.status === "WAITING" || waiting.status === "CALLED") && (
          <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex flex-col items-center">
            <p className="text-sm font-semibold mb-3">입장 QR</p>
            <QRCodeDisplay qrToken={waiting.qrToken} />
          </section>
        )}

        {/* 입장 완료 안내 */}
        {waiting.enteredAt && (
          <section className="border border-gray-200 dark:border-[#282B32] rounded-xl p-5 flex flex-col items-center">
            <div className="w-16 h-16 mb-3 rounded-full border-2 border-point flex items-center justify-center text-point text-3xl">
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

        {/* 함께 갈 친구에게 공유 - 2인 이상만 */}
        {waiting.partySize > 1 && (
          <button type="button" onClick={handleShare} className="w-full rounded-full py-3 text-base font-medium border border-gray-300 dark:border-[#282B32]">
            함께 갈 친구에게 보내기
          </button>
        )}

        {isActive && (
          <button type="button" onClick={handleCancel} className="w-full rounded-full py-3 text-base font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300">
            웨이팅 취소
          </button>
        )}
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
