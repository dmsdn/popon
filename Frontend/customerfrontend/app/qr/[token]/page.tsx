// app/qr/[token]/page.tsx
// 웨이팅 등록 시 문자로 오는 입장 QR 페이지
"use client";

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
        if (s.status === "ENTERED" || s.status === "CANCELLED" || s.status === "NO_SHOW") return;
      } catch {
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
  const noShow = status?.status === "NO_SHOW";
  const called = status?.status === "CALLED";

  return (
    <main className="px-6 py-10 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">
          {entered ? "입장 완료" : cancelled ? "취소된 대기" : noShow ? "미입장 처리" : "입장 QR"}
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

      {noShow && (
        <section className="w-full max-w-sm rounded-xl border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-base font-semibold text-gray-500">미입장 처리된 대기입니다</p>
          <p className="text-sm text-gray-400 mt-2">
            운영일이 지나 대기가 마감됐어요. 재방문 시 새로 웨이팅을 등록해 주세요.
          </p>
        </section>
      )}

      {/* ── 아직 입장 전 — QR과 순번 ── */}
      {!entered && !cancelled && !noShow && (
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
              직원 화면에는 토큰을 손으로 입력하는 칸이 있으므로 이 값만 불러 주면 입장할 수 있음 */}
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
