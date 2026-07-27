"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { searchPopups, type PopupDetail } from "@/lib/api/popups";

// [수정] 카카오맵 대신 네이버 지도로 교체했어요. 백엔드 GeocodingService가 이미
// 네이버 지도(NCP) API를 쓰고 있어서(naver.maps.client-id/client-secret), 같은
// NCP 계정에서 Maps > Application의 "Dynamic Map"만 추가로 켜면 프론트용
// Client ID도 바로 받을 수 있어요. 카카오맵의 최근 유료화 정책(2026.07.21)도
// 피할 수 있고요.
//
// ⚠️ NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경변수가 필요해요.
// NCP 콘솔 > Service > Application Services > Maps > Application에서
// 애플리케이션 등록 후 Client ID를 확인하세요. (Client Secret은 백엔드 지오코딩용이라
// 프론트에는 필요 없어요 — Client ID만 있으면 됩니다.)
//   .env.local에 추가:
//   NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=발급받은_Client_ID
//
// "운영예정(BEFOR)" 팝업도 지도에 같이 보여줄지는 아직 정해지지 않아서, 기본은
// 끔(진행중만 표시) + 토글 버튼으로 켤 수 있게 해뒀어요.
const DEFAULT_SHOW_UPCOMING = false;

declare global {
  interface Window {
    naver: any;
  }
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [sdkReady, setSdkReady] = useState(false);
  const [openPopups, setOpenPopups] = useState<PopupDetail[]>([]);
  const [upcomingPopups, setUpcomingPopups] = useState<PopupDetail[]>([]);
  const [showUpcoming, setShowUpcoming] = useState(DEFAULT_SHOW_UPCOMING);
  const [selected, setSelected] = useState<PopupDetail | null>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;
    searchPopups({ status: "OPEN" }).then((list) => {
      if (!cancelled) setOpenPopups(list.filter((p) => p.latitude != null && p.longitude != null));
    });
    searchPopups({ status: "BEFOR" }).then((list) => {
      if (!cancelled) setUpcomingPopups(list.filter((p) => p.latitude != null && p.longitude != null));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 지도 최초 생성 (진행중 팝업이 있는 위치들의 중심 근처로 시작)
  useEffect(() => {
    if (!sdkReady || !mapRef.current || mapInstance.current) return;
    const center =
      openPopups.length > 0
        ? new window.naver.maps.LatLng(openPopups[0].latitude, openPopups[0].longitude)
        : new window.naver.maps.LatLng(37.5665, 126.978); // 기본값: 서울시청 근방
    mapInstance.current = new window.naver.maps.Map(mapRef.current, { center, zoom: 13 });
  }, [sdkReady, openPopups]);

  // 마커 렌더링 - 진행중(검정, 큰 점) 우선, 운영예정(회색, 옅은 점)은 토글 켰을 때만
  useEffect(() => {
    if (!sdkReady || !mapInstance.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const targets = [
      ...openPopups.map((p) => ({ popup: p, active: true })),
      ...(showUpcoming ? upcomingPopups.map((p) => ({ popup: p, active: false })) : []),
    ];

    targets.forEach(({ popup, active }) => {
      const position = new window.naver.maps.LatLng(popup.latitude, popup.longitude);
      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstance.current,
        icon: {
          content: `<div style="width:${active ? 16 : 12}px;height:${active ? 16 : 12}px;border-radius:50%;background:${
            active ? "#111827" : "#9ca3af"
          };border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          anchor: new window.naver.maps.Point(active ? 8 : 6, active ? 8 : 6),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => setSelected(popup));
      markersRef.current.push(marker);
    });
  }, [sdkReady, openPopups, upcomingPopups, showUpcoming]);

  if (!clientId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-sm font-medium text-gray-700 mb-2">지도를 표시할 수 없어요</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          네이버 지도 API 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 설정되어 있지 않아요.
          <br />
          .env.local에 키를 추가한 뒤 다시 시도해주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="relative w-full h-screen">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`}
        onReady={() => setSdkReady(true)}
      />

      <div ref={mapRef} className="w-full h-full" />

      {/* 상단 바 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-white/95">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-700">
          ‹
        </button>
        <button
          type="button"
          onClick={() => setShowUpcoming((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            showUpcoming ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"
          }`}
        >
          운영예정 팝업 {showUpcoming ? "숨기기" : "함께 보기"}
        </button>
      </div>

      {/* 선택된 팝업 정보 카드 */}
      {selected && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="닫기"
            className="absolute top-2 right-2 text-gray-400 text-sm"
          >
            ✕
          </button>
          <p className="text-sm font-semibold mb-1">{selected.title}</p>
          <p className="text-xs text-gray-400 mb-3">{selected.location}</p>
          <button
            type="button"
            onClick={() => router.push(`/popup/${selected.id}`)}
            className="w-full rounded-full py-2.5 text-sm font-medium bg-gray-900 text-white"
          >
            팝업 상세보기
          </button>
        </div>
      )}
    </main>
  );
}
