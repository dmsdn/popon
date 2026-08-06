// components/popup/ImageCropModal.tsx
// 프로필 사진 등 업로드 시 원형으로 잘라내는 크롭 모달
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_SIZE = 280; // 크롭 화면에 보이는 정사각형 크기(px)
const OUTPUT_SIZE = 800; // 실제로 업로드되는 이미지 고정 크기(px, 정사각형)

// 후기 사진 첨부 시 뜨는 이미지 자르기 화면
// 정사각형(1:1) 고정 비율로, 드래그해서 위치를 옮기고 슬라이더로 확대/축소할 수 있음
// 확인을 누르면 화면에 보이는 부분만 잘라서 항상 800x800px 크기로 고정해 내보냄
export function ImageCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1); // 1 = 뷰포트를 꽉 채우는 최소 배율
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(
    null
  );
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale =
    naturalSize.w > 0 ? Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h) : 1;
  const scale = baseScale * zoom;
  const displayW = naturalSize.w * scale;
  const displayH = naturalSize.h * scale;

  const clampOffset = (x: number, y: number) => {
    const minX = VIEWPORT_SIZE - displayW;
    const minY = VIEWPORT_SIZE - displayH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset(dragState.current.startOffsetX + dx, dragState.current.startOffsetY + dy));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    // 확대/축소해도 뷰포트 중심 기준을 유지하면서 범위 안으로 다시 당겨줌
    setOffset((prev) => clampOffset(prev.x, prev.y));
  };

  const handleConfirm = () => {
    if (!imgUrl) return;
    setProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setProcessing(false);
        return;
      }
      // 뷰포트에 보이는 영역을 원본 이미지 좌표로 역산해서, 그 부분만 OUTPUT_SIZE로
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sSize = VIEWPORT_SIZE / scale;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          setProcessing(false);
          if (blob) onConfirm(blob);
        },
        "image/jpeg",
        0.9
      );
    };
    img.src = imgUrl;
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <div className="bg-white dark:bg-[#282B32] rounded-xl p-5 w-full max-w-sm">
        <p className="text-base font-semibold mb-1">사진 위치 조정</p>
        <p className="text-sm text-gray-400 mb-4">드래그해서 위치를 옮기고, 슬라이더로 확대/축소할 수 있어요.</p>

        <div
          className="relative mx-auto overflow-hidden rounded-lg bg-gray-100 dark:bg-[#17181a] touch-none select-none"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: displayW || undefined,
                height: displayH || undefined,
                maxWidth: "none",
              }}
            />
          )}
          {/* 정사각형 크롭 영역임을 보여주는 테두리 */}
          <div className="absolute inset-0 border-2 border-white pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm text-gray-400 flex-none">축소</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-400 flex-none">확대</span>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full py-3 text-base font-medium bg-gray-100 dark:bg-[#17181a] text-gray-700 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !imgUrl}
            className="flex-1 rounded-full py-3 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-50"
          >
            {processing ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
