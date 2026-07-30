// components/ui/QRCodeDisplay.tsx
//
// [신규] 예약/웨이팅 상세페이지에 QR 코드를 보여주는 기능이 아예 없었어요.
// qrToken 값은 API 응답에 이미 있는데(백엔드가 등록 시점에 바로 발급해요),
// 이걸 화면에 스캔 가능한 QR 이미지로 그려주는 부분이 없었던 거예요.
//
// 새 패키지를 추가하지 않으려고(이 프로젝트의 실제 package.json을 확인할 방법이
// 없어서 QR 생성 라이브러리가 설치되어 있는지 몰라요) 공개 QR 생성 이미지
// 서비스(api.qrserver.com, 널리 쓰이는 무료 서비스)를 <img>로 불러오는 방식을
// 썼어요. 오프라인/인터넷 안 되는 상황에서는 이미지가 안 뜨는 게 유일한 단점이에요.
//
// ⚠️ 백엔드가 문자로 보내는 QR 내용은 "https://your-domain.com/qr/{token}"인데
// your-domain.com이 실제 배포 주소가 아니라 임시 placeholder예요. 여기서는 지금
// 접속 중인 실제 주소(window.location.origin)를 써서 만들어요 - 그래서 문자로
// 온 QR이랑 이 화면에 뜨는 QR이 당장은 다른 URL을 가리킬 수 있어요. 백엔드가
// 실제 도메인으로 이 값을 설정하면 그때 맞춰지니, 백엔드 요청 목록에 있어요.

export function QRCodeDisplay({ qrToken, size = 200 }: { qrToken: string; size?: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qrContent = `${origin}/qr/${qrToken}`;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    qrContent
  )}`;

  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="입장용 QR 코드" width={size} height={size} className="rounded-lg border border-gray-100 dark:border-gray-800" />
      <p className="text-sm text-gray-400 mt-2">직원에게 이 QR 코드를 보여주세요</p>
    </div>
  );
}
