// components/ui/QRCodeDisplay.tsx
// 예약/웨이팅 상세페이지에 QR 코드를 그려서 보여주는 컴포넌트

export function QRCodeDisplay({ qrToken, size = 200 }: { qrToken: string; size?: number }) {
  const src =`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    qrToken
  )}`;

  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="입장용 QR 코드" width={size} height={size} className="rounded-lg border border-gray-100 dark:border-[#282B32]" />
      <p className="text-sm text-gray-400 mt-2">직원에게 이 QR 코드를 보여주세요</p>
    </div>
  );
}
