"use client";

// 웨이팅 등록 시 문자로 오는 입장 QR 페이지 - 로그인 없이 토큰만으로 내 대기 상태를 확인할 수 있어요.

// 입장 QR 페이지 (7/31 신설)
//
// 웨이팅을 접수하면 백엔드가 문자·메일로 이 주소를 보낸다.
//
//   "팝업스토어 입장 QR: https://{소비자앱}/qr/{token}"
//   → WaitingQueueService.register()
//
// 그런데 **이 페이지가 없어서 열면 404였다.** 링크만 보내고 받을 곳을 안 만든 상태였다.
//
// 처음에는 QR만 띄우는 정적 화면으로 만들었는데, 그러면 **직원이 QR을 찍어 입장 처리를 해도
// 손님 화면에는 아무 변화가 없다.** 들어가도 되는지 손님이 알 방법이 없어서
// 상태를 3초마다 확인해 화면을 바꾸도록 고쳤다 (GET /api/waiting/qr/{token}, 7/31 백엔드 신설).
//
// 이 화면은 서버에 대기 상태만 묻는다 — **토큰 자체가 곧 자격 증명**이라 로그인이 필요 없고,
// 그래서 비회원(/walkin으로 접수한 사람)도 그대로 쓸 수 있다.
// 회원용 웨이팅 상세(/waiting/[id])는 로그인이 필요해 비회원이 못 들어간다.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { getWaitingStatusByQr, type WaitingQrStatus } from "@/lib/api/waiting";

const POLL_MS = 3000;

export default function EntryQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<WaitingQrStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const s = await getWaitingStatusByQr(token);
        if (!alive) return;
        setStatus(s);
        setNotFound(false);
        // 입장·취소로 끝난 대기는 더 물어볼 이유가 없다 — 폴링을 멈춘다.
        if (s.status === "ENTERED" || s.status === "CANCELLED") return;
      } catch {
        // 없는 토큰이거나 서버가 잠깐 죽은 경우. 화면은 QR을 계속 보여 주고
        // (직원이 스캔하는 데는 서버 응답이 필요 없다) 안내만 바꾼다.
        if (alive) setNotFound(true);
      }
      if (alive) timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [token]);

  const entered = status?.status === "ENTERED";
  const cancelled = status?.status === "CANCELLED";
  const called = status?.status === "CALLED";

  return (
    <main className="px-6 py-10 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">
          {entered ? "입장 완료" : cancelled ? "취소된 대기" : "입장 QR"}
        </h1>
        {status?.popupTitle && (
          <p className="text-sm text-gray-400 mt-1">{status.popupTitle}</p>
        )}
      </div>

      {/* ── 입장 완료 — 가장 크게, 가장 먼저 ── */}
      {entered && (
        <section className="w-full max-w-sm rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            입장 처리되었습니다
          </p>
          <p className="text-sm text-gray-400 mt-2">
            즐거운 관람 되세요. 이 QR은 더 이상 사용되지 않습니다.
          </p>
        </section>
      )}

      {cancelled && (
        <section className="w-full max-w-sm rounded-xl border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-base font-semibold text-gray-500">취소된 대기입니다</p>
          <p className="text-sm text-gray-400 mt-2">현장 직원에게 문의해 주세요.</p>
        </section>
      )}

      {/* ── 아직 입장 전 — QR과 순번 ── */}
      {!entered && !cancelled && (
        <>
          {called && (
            <section className="w-full max-w-sm rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                호출되었습니다 — 입구로 와 주세요
              </p>
            </section>
          )}

          <section className="w-full max-w-sm border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col items-center">
            <QRCodeDisplay qrToken={token} />
          </section>

          {status && (
            <section className="w-full max-w-sm grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
                <p className="text-sm text-gray-400">내 대기번호</p>
                <p className="text-xl font-semibold mt-0.5">{status.teamNumber ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
                <p className="text-sm text-gray-400">앞에 남은 팀</p>
                <p className="text-xl font-semibold mt-0.5">
                  {status.status === "WAITING" ? (status.teamsAhead ?? "-") : "-"}
                </p>
              </div>
            </section>
          )}

          {/* 카메라가 없거나 QR 이미지가 안 뜨는 환경(오프라인 등)을 위한 폴백.
              직원 화면에는 토큰을 손으로 입력하는 칸이 있으므로 이 값만 불러 주면 입장할 수 있다. */}
          <section className="w-full max-w-sm">
            <p className="text-sm text-gray-400 mb-1.5">
              QR이 안 보이면 아래 번호를 직원에게 알려 주세요.
            </p>
            <p
              className="text-sm break-all rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-gray-500"
              style={{ fontFamily: "monospace" }}
            >
              {token}
            </p>
          </section>

          <ul className="w-full max-w-sm flex flex-col gap-2 text-sm text-gray-400">
            <li>· 이 화면은 로그인 없이 열 수 있습니다.</li>
            <li>· 입장 처리가 끝나면 이 화면이 자동으로 바뀝니다.</li>
            {notFound && <li className="text-amber-500">· 대기 정보를 불러오지 못했습니다. QR은 그대로 사용할 수 있습니다.</li>}
          </ul>
        </>
      )}

      <Link href="/" className="text-sm text-gray-400 underline underline-offset-4">
        홈으로
      </Link>
    </main>
  );
}
