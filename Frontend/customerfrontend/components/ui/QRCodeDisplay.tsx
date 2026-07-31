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
// [해결됨 7/31] 위 ⚠️는 두 갈래로 정리됐어요.
//   1) 백엔드 app.qr-base-url 이 배포 주소로 설정됐어요 (문자 링크가 실제로 열려요).
//   2) 그 링크가 도착하는 /qr/{token} 페이지를 새로 만들었어요 (그전엔 404였어요).
// 그리고 이 컴포넌트는 이제 주소가 아니라 토큰만 담아요 - 아래 주석 참고.

export function QRCodeDisplay({ qrToken, size = 200 }: { qrToken: string; size?: number }) {
  // 7/31 — QR에 담는 값을 주소에서 **토큰 자체**로 바꿨다.
  //
  // 그전에는 `${window.location.origin}/qr/${qrToken}`을 담았는데, 이 컴포넌트가
  // 서버에서 먼저 렌더되는 자리에 있어 **`window`가 없어 origin이 빈 문자열**이 됐다.
  // 결과가 `/qr/{token}` — 어디도 가리키지 않는 반쪽짜리 주소였다.
  //
  // 애초에 이 QR을 읽는 것은 **주최자 화면의 스캐너**이고, 그쪽은 토큰으로 입장을 처리한다
  // (checkinUnifiedQr). 주소를 담아 봐야 스캐너가 다시 토큰을 뽑아내야 할 뿐이다.
  // 토큰만 담으면 SSR 문제도 사라지고 QR도 짧아져 스캔이 쉬워진다.
  //
  // 주최자 스캐너는 옛 형식(주소)도 계속 받아 준다 — 이미 발송된 문자·메일이 남아 있으므로.
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    qrToken
  )}`;

  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="입장용 QR 코드" width={size} height={size} className="rounded-lg border border-gray-100 dark:border-gray-800" />
      <p className="text-sm text-gray-400 mt-2">직원에게 이 QR 코드를 보여주세요</p>
    </div>
  );
}
