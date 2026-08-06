// app/checkin/scan/page.tsx
// QR 입장 찍기 전용 화면
"use client";

// 직원이 카메라로 입장 QR을 스캔 (예약/웨이팅 손님 입장 처리)
// QR 스캔 로직은 popupfrontend(주최자센터) 대기열·인원 관제 화면(WaitingControl.tsx)의 "통합 QR 체크인" 기능
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

function ScanPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const popupId = searchParams.get("popupId");

  const [popupTitle, setPopupTitle] = useState<string | null>(null);
  const [camError, setCamError] = useState("");
  const [qrMsg, setQrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualQr, setManualQr] = useState(""); // 카메라를 못 쓸 때 폴백 입력
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanRef = useRef<{ v: string; t: number }>({ v: "", t: 0 });

  useEffect(() => {
    if (!popupId) return;
    fetch(`/api/popups/${popupId}`)
      .then((res) => res.json())
      .then((data) => setPopupTitle(data.title ?? null))
      .catch((err) => console.error("팝업 정보 조회 실패", err));
  }, [popupId]);

  // 스캔·입력값에서 토큰만
  const extractQrToken = (raw: string) => {
    const v = raw.trim();
    const m = v.match(/\/qr\/([^/?#\s]+)/);
    return m ? m[1] : v;
  };

  const processQrValue = async (raw: string) => {
    const v = extractQrToken(raw);
    if (!v || !popupId) return;
    const token = getToken();
    if (!token) {
      setQrMsg({ ok: false, text: "로그인이 필요해요. 팝업 선택 화면에서 다시 시작해주세요." });
      return;
    }
    try {
      // 통합 QR 체크인 - QR 종류는 서버가 알아서 판별하고, popupId로 현재 팝업의 QR인지까지 검증해 안전하게 체크인
      const res = await fetch("/api/queue/checkin/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrToken: v, popupId: Number(popupId) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "QR 입장 처리에 실패했어요.");
      }
      const entry = await res.json();
      setQrMsg({
        ok: true,
        text: `${entry.displayName}님(${entry.source === "RESERVATION" ? "사전예약" : "현장 웨이팅"}) 입장 처리 완료`,
      });
    } catch (err) {
      setQrMsg({ ok: false, text: err instanceof Error ? err.message : "QR 입장 처리에 실패했어요." });
    }
  };

  // QR 입장 화면이 열리면 카메라를 자동으로 실행 (프레임 단위로 실시간 분석)
  // 즉시 서버에 체크인 요청을 보내 입장 처리 (원본: popupfrontend WaitingControl.tsx)
  useEffect(() => {
    setCamError("");
    setQrMsg(null);
    let stream: MediaStream | null = null;
    let raf = 0;
    let active = true;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    import("jsqr").then(({ default: jsQR }) => {
      if (!active) return;
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          if (!active) {
            s.getTracks().forEach((tr) => tr.stop());
            return;
          }
          stream = s;
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = s;
          video.play().catch(() => {});
          const tick = () => {
            if (!active) return;
            if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(img.data, img.width, img.height);
              if (code?.data) {
                const now = Date.now();
                // 같은 QR 연속 인식 방지 (3초 쿨다운)
                if (code.data !== lastScanRef.current.v || now - lastScanRef.current.t > 3000) {
                  lastScanRef.current = { v: code.data, t: now };
                  processQrValue(code.data);
                }
              }
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        })
        .catch(() => setCamError("카메라를 사용할 수 없어요. 아래에 QR 값을 직접 입력해주세요."));
    });

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupId]);

  if (!popupId) {
    return (
      <main className="h-full flex items-center justify-center px-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-bold">팝업이 선택되지 않았어요</p>
          <button
            type="button"
            onClick={() => router.push("/select-popup")}
            className="rounded-full px-6 py-3 text-base font-bold bg-point text-gray-900"
          >
            팝업 선택 화면으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full flex flex-col items-center justify-center px-8 py-10 relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/LOGO_Dark.svg"
        alt="POP-ON"
        className="absolute top-6 left-6 w-20 h-auto"
      />
      <button
        type="button"
        onClick={() => router.push("/select-popup")}
        className="absolute top-6 right-6 text-sm text-gray-400 border border-gray-700 rounded-full px-4 py-2"
      >
        팝업 선택으로
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          {popupTitle && <p className="text-base text-gray-400 mb-1">{popupTitle}</p>}
          <p className="text-xl font-bold text-white">QR 입장 찍기</p>
        </div>

        {!camError ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square w-full">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/5 h-3/5 border-2 border-point/80 rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <p className="text-sm text-amber-400">{camError}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processQrValue(manualQr);
                setManualQr("");
              }}
              className="flex gap-2"
            >
              <input
                value={manualQr}
                onChange={(e) => setManualQr(e.target.value)}
                placeholder="QR 값 직접 입력"
                className="flex-1 min-w-0 bg-card text-white rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-point"
              />
              <button type="submit" className="px-5 py-3 rounded-xl bg-point text-gray-900 font-bold">
                처리
              </button>
            </form>
          </div>
        )}

        <div className="min-h-[24px] text-center">
          {qrMsg && <p className={`text-base font-medium ${qrMsg.ok ? "text-point" : "text-red-400"}`}>{qrMsg.text}</p>}
          {!qrMsg && !camError && (
            <p className="text-sm text-gray-400">QR을 프레임 안에 맞추면 자동으로 입장 처리돼요.</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanPageInner />
    </Suspense>
  );
}
