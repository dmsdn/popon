"use client";

// 입장 QR 페이지 (7/31 신설)
//
// 웨이팅을 접수하면 백엔드가 문자·메일로 이 주소를 보낸다.
//
//   "팝업스토어 입장 QR: https://{소비자앱}/qr/{token}"
//   → WaitingQueueService.registerWaiting()
//
// 그런데 **이 페이지가 없어서 열면 404였다.** 링크만 보내고 받을 곳을 안 만든 상태였다.
// (백엔드 설정 주석에도 "/qr/{token} 페이지는 아직 미구현이라 안내 문자열 용도"라고 적혀 있었다)
//
// 이 페이지는 서버에 아무것도 묻지 않는다. **토큰 자체가 곧 자격 증명**이고,
// 화면이 할 일은 그것을 스캔 가능한 형태로 보여 주는 것뿐이기 때문이다.
// 덕분에 비회원(로그인 없이 /walkin으로 접수한 사람)도 그대로 쓸 수 있다 —
// 웨이팅 상세(/waiting/[id])는 로그인이 필요해서 비회원이 못 들어간다.

import { use } from "react";
import Link from "next/link";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";

export default function EntryQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <main className="px-6 py-10 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">입장 QR</h1>
        <p className="text-sm text-gray-400 mt-1">
          현장에서 직원에게 이 화면을 보여 주세요.
        </p>
      </div>

      <section className="w-full max-w-sm border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col items-center">
        <QRCodeDisplay qrToken={token} />
      </section>

      {/* 카메라가 없거나 QR 이미지가 안 뜨는 환경(오프라인 등)을 위한 폴백.
          직원 화면에는 토큰을 손으로 입력하는 칸이 있으므로, 이 값만 불러 주면 입장할 수 있다. */}
      <section className="w-full max-w-sm">
        <p className="text-xs text-gray-400 mb-1.5">
          QR이 안 보이면 아래 번호를 직원에게 알려 주세요.
        </p>
        <p
          className="text-xs break-all rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-gray-500"
          style={{ fontFamily: "monospace" }}
        >
          {token}
        </p>
      </section>

      <ul className="w-full max-w-sm flex flex-col gap-2 text-xs text-gray-400">
        <li>· 이 화면은 로그인 없이 열 수 있습니다.</li>
        <li>· 입장 처리가 끝나면 QR은 더 이상 사용되지 않습니다.</li>
        <li>· 순서가 되면 문자로 안내드립니다.</li>
      </ul>

      <Link href="/" className="text-sm text-gray-400 underline underline-offset-4">
        홈으로
      </Link>
    </main>
  );
}
