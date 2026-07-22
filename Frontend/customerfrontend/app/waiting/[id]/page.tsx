"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// TODO: 실제로는 id 기준으로 백엔드에서 웨이팅 상세 조회
const mockWaitingDetail = {
  id: "w1",
  popupId: "1",
  popupName: "팝업 이름",
  location: "위치",
  partySize: 2,
  registeredAt: "11:00",
  aheadCount: 7,
  estimatedMinutes: 10,
  myOrder: 7,
};

const POLICY = [
  "순서가 되면 카카오톡으로 알림을 보내드려요. 5분 내 미확인 시 다음 순번으로 넘어갈 수 있어요.",
  "잦은 취소·노쇼는 서비스 이용에 제한이 있을 수 있어요.",
];

export default function WaitingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  const router = useRouter();
  const [waiting] = useState(mockWaitingDetail);

  const handleCancel = () => {
    if (!confirm("웨이팅을 취소할까요?")) return;
    alert("웨이팅이 취소됐어요.");
    router.back();
  };

  const handleShare = async () => {
    const shareData = {
      title: waiting.popupName,
      text: `${waiting.popupName} 웨이팅 현황을 공유해요.`,
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
        <h1 className="text-lg font-bold">웨이팅 상세</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-8">
        <Link href={`/popup/${waiting.popupId}`} className="flex items-center gap-4">
          <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
            이미지
          </div>
          <div>
            <p className="text-sm font-semibold">{waiting.popupName}</p>
            <p className="text-xs text-gray-400 mt-0.5">팝업 페이지 보기 ›</p>
          </div>
        </Link>

        <section className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">내 순번</p>
              <p className="text-3xl font-bold">
                {waiting.myOrder}
                <span className="text-sm font-normal text-gray-500 ml-0.5">번째</span>
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>앞 {waiting.aheadCount}팀</p>
              <p>예상 대기 약 {waiting.estimatedMinutes}분</p>
            </div>
          </div>
          <Row label="인원" value={`${waiting.partySize}명`} />
          <Row label="위치" value={waiting.location} />
          <Row label="등록 시간" value={waiting.registeredAt} />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">이용 안내</h2>
          <ul className="flex flex-col gap-2">
            {POLICY.map((text) => (
              <li key={text} className="text-xs text-gray-500 leading-relaxed">· {text}</li>
            ))}
          </ul>
        </section>

        <button type="button" onClick={handleCancel} className="w-full rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700">
          웨이팅 취소
        </button>

        <button type="button" onClick={handleShare} className="w-full rounded-full py-3 text-sm font-medium border border-gray-300">
          함께 갈 친구에게 보내기
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-gray-50 first:border-t-0 first:pt-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}