"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { searchPopups, getPopupImages, type PopupDetail } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

// [수정] 네이버 지도 - 핀에 팝업 이름 라벨을 붙이고, 핀을 누르면 이미지 참고하신
// 형태(썸네일+상태+이름+주소+기간)의 카드가 뜨도록 다시 만들었어요. 카드 전체를
// 누르면 해당 팝업 상세페이지로 이동해요.
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
  const [sdkAuthFailed, setSdkAuthFailed] = useState(false);
  const [openPopups, setOpenPopups] = useState<PopupDetail[]>([]);
  const [upcomingPopups, setUpcomingPopups] = useState<PopupDetail[]>([]);
  const [showUpcoming, setShowUpcoming] = useState(DEFAULT_SHOW_UPCOMING);
  const [selected, setSelected] = useState<PopupDetail | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  // [수정] 네이버 지도는 인증 실패 시에도 스크립트 자체는 로드되지만 naver.maps가
  // null이 돼서, 그대로 new naver.maps.LatLng(...)를 호출하면 화면이 통째로
  // 하얗게 죽어버렸어요(Uncaught TypeError). 인증 실패를 감지하는 전역 콜백을
  // 등록해서, 실패하면 지도 대신 안내 문구를 보여주게 했어요.
  useEffect(() => {
    (window as any).navermap_authFailure = () => setSdkAuthFailed(true);
  }, []);

  const q = query.trim().toLowerCase();
  const visibleOpen = q ? openPopups.filter((p) => p.title.toLowerCase().includes(q)) : openPopups;
  const visibleUpcoming = q ? upcomingPopups.filter((p) => p.title.toLowerCase().includes(q)) : upcomingPopups;

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

  // 선택한 팝업이 바뀔 때마다 대표 이미지 하나만 가져와요 (핀마다 미리 다 가져오면
  // 요청이 너무 많아져서, 선택했을 때만 lazy하게 불러와요).
  useEffect(() => {
    if (!selected) {
      setSelectedImageUrl(null);
      return;
    }
    let cancelled = false;
    getPopupImages(selected.id)
      .then((images) => {
        if (!cancelled) setSelectedImageUrl(images[0]?.imageUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setSelectedImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // 지도 최초 생성 (진행중 팝업이 있는 위치들의 중심 근처로 시작)
  useEffect(() => {
    if (!sdkReady || !window.naver?.maps || !mapRef.current || mapInstance.current) return;
    const center =
      openPopups.length > 0
        ? new window.naver.maps.LatLng(openPopups[0].latitude, openPopups[0].longitude)
        : new window.naver.maps.LatLng(37.5665, 126.978); // 기본값: 서울시청 근방
    mapInstance.current = new window.naver.maps.Map(mapRef.current, { center, zoom: 14 });
  }, [sdkReady, openPopups]);

  // 마커 렌더링 - 진행중(검정 핀)이 우선, 운영예정(회색 핀)은 토글 켰을 때만.
  // 핀마다 팝업 이름을 작은 라벨로 같이 보여줘요.
  useEffect(() => {
    if (!sdkReady || !window.naver?.maps || !mapInstance.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const targets = [
      ...visibleOpen.map((p) => ({ popup: p, active: true })),
      ...(showUpcoming ? visibleUpcoming.map((p) => ({ popup: p, active: false })) : []),
    ];

    targets.forEach(({ popup, active }) => {
      const position = new window.naver.maps.LatLng(popup.latitude, popup.longitude);
      const isSelected = selected?.id === popup.id;
      const dotColor = active ? "#111827" : "#9ca3af";
      const label = popup.title.length > 8 ? `${popup.title.slice(0, 8)}…` : popup.title;

      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstance.current,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);">
              <div style="
                font-size:10px; font-weight:${isSelected ? 700 : 500};
                color:${isSelected ? "#ffffff" : "#111827"};
                background:${isSelected ? "#111827" : "#ffffff"};
                border:1px solid ${isSelected ? "#111827" : "#e5e7eb"};
                border-radius:999px; padding:2px 7px; margin-bottom:3px;
                white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.15);
              ">${label}</div>
              <div style="
                width:${isSelected ? 18 : 14}px; height:${isSelected ? 18 : 14}px; border-radius:50%;
                background:${dotColor}; border:2px solid white;
                box-shadow:0 1px 3px rgba(0,0,0,0.3);
              "></div>
            </div>`,
          anchor: new window.naver.maps.Point(isSelected ? 9 : 7, isSelected ? 26 : 22),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => setSelected(popup));
      markersRef.current.push(marker);
    });

    // 검색어가 있고 결과가 있으면 첫 결과로 지도 중심 이동 + 자동 선택
    if (q && targets.length > 0) {
      const first = targets[0].popup;
      mapInstance.current.setCenter(new window.naver.maps.LatLng(first.latitude, first.longitude));
      mapInstance.current.setZoom(16);
      setSelected(first);
    }
  }, [sdkReady, visibleOpen, visibleUpcoming, showUpcoming, q, selected?.id]);

  if (!clientId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <img src="/Icon/pin.svg" alt="" className="text-gray-300 mb-3" width={40} height={40}  />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">지도를 표시할 수 없어요</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          네이버 지도 API 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 설정되어 있지 않아요.
          <br />
          .env.local에 키를 추가한 뒤 다시 시도해주세요.
        </p>
      </main>
    );
  }

  if (sdkAuthFailed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <img src="/Icon/pin.svg" alt="" className="text-gray-300 mb-3" width={40} height={40}  />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">지도 인증에 실패했어요</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          네이버 클라우드 플랫폼 콘솔에 등록된 서비스 URL과
          <br />
          지금 접속 중인 주소({typeof window !== "undefined" ? window.location.origin : ""})가 달라요.
          <br />
          Maps 애플리케이션 설정에서 이 주소를 등록해주세요.
        </p>
      </main>
    );
  }

  const selectedItem = selected ? toPopupItem(selected) : null;

  return (
    <main className="relative w-full h-screen">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        onReady={() => setSdkReady(true)}
      />

      <div ref={mapRef} className="w-full h-full" />

      {/* 상단 바 */}
      <div className="absolute top-0 left-0 right-0 flex flex-col gap-2 px-4 py-3 bg-white/95 dark:bg-gray-900/95">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-700 dark:text-gray-300">
            ‹
          </button>
          <button
            type="button"
            onClick={() => setShowUpcoming((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              showUpcoming ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600 dark:text-gray-400"
            }`}
          >
            운영예정 팝업 {showUpcoming ? "숨기기" : "함께 보기"}
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="팝업 이름으로 찾기"
          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full px-4 py-2.5 text-sm outline-none"
        />
      </div>

      {/* 선택된 팝업 카드 - 카드 전체를 누르면 상세페이지로 이동 */}
      {selected && selectedItem && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-gray-500 text-sm shadow-sm"
            >
              ✕
            </button>
            <Link href={`/popup/${selected.id}`} className="flex items-stretch gap-3 p-3">
              <div className="w-20 h-20 flex-none rounded-lg overflow-hidden bg-gray-100">
                {selectedImageUrl ? (
                  <ImageWithFallback src={selectedImageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                    이미지
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge status={selectedItem.status} />
                  {selectedItem.location && (
                    <span className="text-sm text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                      {selectedItem.location}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">{selected.title}</p>
                {selectedItem.dateRange && (
                  <p className="text-sm text-gray-400">{selectedItem.dateRange}</p>
                )}
              </div>
              <span className="self-center text-gray-300 text-lg flex-none">›</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
