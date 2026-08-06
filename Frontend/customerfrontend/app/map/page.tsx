// app/map/page.tsx
// 지도로 팝업 찾기 페이지 - 네이버 지도 마커, 선택 팝업 카드 하단 표시
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { searchPopups, getPopupImages, getPopupWishlistCount, type PopupDetail } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const DEFAULT_SHOW_UPCOMING = false;

// 좌표 동일(같은 건물) 팝업 겹침 방지 - 그룹화 후 고정 시드 기반 무작위 분산 배치
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

function spreadOverlappingPositions<T extends { latitude: number; longitude: number }>(
  items: T[]
): (T & { displayLat: number; displayLng: number })[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    // 소수점 4자리 ≈ 약 11m 반경
    const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const result: (T & { displayLat: number; displayLng: number })[] = [];
  for (const [key, group] of groups) {
    if (group.length === 1) {
      result.push({ ...group[0], displayLat: group[0].latitude, displayLng: group[0].longitude });
      continue;
    }
    // 반경 9~22m 랜덤 거리·방향 분산 (원형 배치는 기계적으로 보여 제외)
    group.forEach((item, i) => {
      const seed = `${key}_${i}`;
      const angle = seededRandom(`${seed}_angle`) * 2 * Math.PI;
      const radius = 0.00008 + seededRandom(`${seed}_radius`) * 0.00012;
      result.push({
        ...item,
        displayLat: item.latitude + radius * Math.sin(angle),
        displayLng: item.longitude + radius * Math.cos(angle),
      });
    });
  }
  return result;
}

// 화면 축소 시 핀 겹침 방지 - 픽셀 거리 기준 클러스터링(숫자 뱃지), 클릭 시 확대. idle 이벤트마다 재계산
const CLUSTER_PIXEL_SIZE = 60;

function clusterByScreenDistance<T extends { displayLat: number; displayLng: number }>(
  items: T[],
  map: any
): { items: T[]; centerLat: number; centerLng: number }[] {
  const projection = map.getProjection();
  const buckets = new Map<string, { items: T[]; sumLat: number; sumLng: number }>();

  items.forEach((item) => {
    const offset = projection.fromCoordToOffset(
      new window.naver.maps.LatLng(item.displayLat, item.displayLng)
    );
    // CLUSTER_PIXEL_SIZE 격자 단위로 클러스터 그룹화
    const key = `${Math.floor(offset.x / CLUSTER_PIXEL_SIZE)}_${Math.floor(offset.y / CLUSTER_PIXEL_SIZE)}`;
    const bucket = buckets.get(key) ?? { items: [], sumLat: 0, sumLng: 0 };
    bucket.items.push(item);
    bucket.sumLat += item.displayLat;
    bucket.sumLng += item.displayLng;
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values()).map((bucket) => ({
    items: bucket.items,
    centerLat: bucket.sumLat / bucket.items.length,
    centerLng: bucket.sumLng / bucket.items.length,
  }));
}

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
  const [selectedWishlistCount, setSelectedWishlistCount] = useState<number | null>(null);

  useEffect(() => {
    if (!selected) {
      setSelectedWishlistCount(null);
      return;
    }
    let cancelled = false;
    getPopupWishlistCount(selected.id)
      .then((res) => {
        if (!cancelled) setSelectedWishlistCount(res.wishlistCount);
      })
      .catch((err) => console.error("찜 개수 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [selected]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // 검색 결과 바텀시트 표시 여부 - 검색어 입력 시 자동 오픈, 선택/X버튼으로 닫힘
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  // 지도 이동/줌 시 마커·클러스터 재계산 트리거
  const [viewTick, setViewTick] = useState(0);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  // 지도 인증 실패 감지 콜백 (실패 시 naver.maps가 null이라 화면 통째로 깨지던 문제 방지)
  useEffect(() => {
    (window as any).navermap_authFailure = () => setSdkAuthFailed(true);
  }, []);

  const q = query.trim().toLowerCase();
  const visibleOpen = q ? openPopups.filter((p) => p.title.toLowerCase().includes(q)) : openPopups;
  const visibleUpcoming = q ? upcomingPopups.filter((p) => p.title.toLowerCase().includes(q)) : upcomingPopups;

  // 검색어 입력 시 바텀시트 오픈 + 선택 해제, 검색어 삭제 시 닫힘
  useEffect(() => {
    if (q) {
      setShowSearchSheet(true);
      setSelected(null);
    } else {
      setShowSearchSheet(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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

  // 선택한 팝업이 바뀔 때마다 대표 이미지 하나만
  useEffect(() => {
    if (!selected) {
      setSelectedImageUrl(null);
      return;
    }
    let cancelled = false;
    getPopupImages(selected.id)
      .then((images) => {
        // 대표 이미지 - type === "THUMBNAIL" 우선, 없으면 첫 이미지로 폴백
        const cover = images.find((img) => img.type === "THUMBNAIL") ?? images[0];
        if (!cancelled) setSelectedImageUrl(cover?.imageUrl ?? null);
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
    // idle(드래그/확대축소 종료) 시 클러스터 재계산
    window.naver.maps.Event.addListener(mapInstance.current, "idle", () => {
      setViewTick((v) => v + 1);
    });
  }, [sdkReady, openPopups]);

  // 마커 렌더링 - 진행중(검정 핀)이 우선, 운영예정(회색 핀)은 토글 켰을 때만
  // 핀마다 팝업 이름을 작은 라벨로 같이 보여줌
  useEffect(() => {
    if (!sdkReady || !window.naver?.maps || !mapInstance.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const targets = spreadOverlappingPositions([
      ...visibleOpen.map((p) => ({ popup: p, active: true })),
      ...(showUpcoming ? visibleUpcoming.map((p) => ({ popup: p, active: false })) : []),
    ].map((t) => ({ ...t, latitude: t.popup.latitude!, longitude: t.popup.longitude! })));

    // 픽셀 거리 기준 재그룹화 - 1개면 이름표 핀, 2개 이상이면 클러스터 뱃지
    const clusters = clusterByScreenDistance(targets, mapInstance.current);

    clusters.forEach((cluster) => {
      if (cluster.items.length > 1) {
        const containsSelected = cluster.items.some((t) => t.popup.id === selected?.id);
        const clusterMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(cluster.centerLat, cluster.centerLng),
          map: mapInstance.current,
          zIndex: containsSelected ? 250 : 150,
          icon: {
            content: `
              <div style="
                width:40px; height:40px; border-radius:50%;
                display:flex; align-items:center; justify-content:center;
                background:#5bce41; border:3px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,0.35);
                color:#111827; font-size:14px; font-weight:700;
              ">${cluster.items.length}</div>`,
            anchor: new window.naver.maps.Point(20, 20),
          },
        });
        // 클러스터를 누르면 그 위치로 확대해서 핀들이 각자 눌릴 수 있을 만큼 퍼지게 함
        window.naver.maps.Event.addListener(clusterMarker, "click", () => {
          const map = mapInstance.current;
          map.setCenter(new window.naver.maps.LatLng(cluster.centerLat, cluster.centerLng));
          map.setZoom(Math.min(map.getZoom() + 3, 21));
        });
        markersRef.current.push(clusterMarker);
        return;
      }

      const { popup, active, displayLat, displayLng } = cluster.items[0];
      const position = new window.naver.maps.LatLng(displayLat, displayLng);
      const isSelected = selected?.id === popup.id;
      const dotColor = active ? "#5bce41" : "#9ca3af";
      const label = popup.title.length > 8 ? `${popup.title.slice(0, 8)}…` : popup.title;

      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstance.current,
        // 선택된 마커 zIndex 명시 - 겹칠 때 항상 맨 위에 표시
        zIndex: isSelected ? 200 : active ? 100 : 50,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);">
              <div style="
                font-size:13px; font-weight:${isSelected ? 700 : 500};
                color:${isSelected ? "#ffffff" : "#111827"};
                background:${isSelected ? "#111827" : "#ffffff"};
                border:1px solid ${isSelected ? "#111827" : "#e5e7eb"};
                border-radius:999px; padding:8px 16px; margin-bottom:3px;
                white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.15);
              ">${label}</div>
              <div style="
                width:${isSelected ? 26 : 20}px; height:${isSelected ? 26 : 20}px; border-radius:50%;
                background:${dotColor}; border:3px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,0.35);
              "></div>
            </div>`,
          anchor: new window.naver.maps.Point(isSelected ? 13 : 10, isSelected ? 50 : 44),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        setSelected(popup);
        setShowSearchSheet(false);
      });
      markersRef.current.push(marker);
    });
  }, [sdkReady, visibleOpen, visibleUpcoming, showUpcoming, selected?.id, viewTick]);

  // 지도 중심 이동 - 검색어(q) 변경 시에만 실행되는 별도 이펙트로 분리 (선택 시 지도 축소되던 문제 방지)
  useEffect(() => {
    if (!sdkReady || !window.naver?.maps || !mapInstance.current || !q) return;
    const targets = [...visibleOpen, ...(showUpcoming ? visibleUpcoming : [])];
    if (targets.length === 0) return;
    const first = targets[0];
    mapInstance.current.setCenter(new window.naver.maps.LatLng(first.latitude, first.longitude));
    mapInstance.current.setZoom(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, q]);

  if (!clientId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <img src="/icons/ui/pin.svg" alt="" className="text-gray-300 mb-3 dark:invert" width={40} height={40} />
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">지도를 표시할 수 없어요</p>
        <p className="text-base text-gray-400 leading-relaxed">
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
        <img src="/icons/ui/pin.svg" alt="" className="text-gray-300 mb-3 dark:invert" width={40} height={40} />
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">지도 인증에 실패했어요</p>
        <p className="text-base text-gray-400 leading-relaxed">
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
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3 bg-white/95 dark:bg-[#282B32]/95">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="flex-none text-gray-700 dark:text-gray-300">
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="팝업 이름으로 찾기"
          className="flex-1 min-w-0 bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-full px-4 py-2.5 text-base outline-none"
        />
        <button
          type="button"
          onClick={() => setShowUpcoming((v) => !v)}
          className={`flex-none whitespace-nowrap text-base px-3 py-1.5 rounded-full border ${
            showUpcoming ? "bg-point text-gray-900 dark:text-white border-point" : "border-gray-300 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
          }`}
        >
          운영예정 {showUpcoming ? "숨기기" : "함께 보기"}
        </button>
      </div>

      {/* 검색 결과 바텀시트 */}
      {showSearchSheet && (
        <div className="absolute bottom-0 left-0 right-0 max-h-[55vh] flex flex-col bg-white dark:bg-[#282B32] rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#17181a] flex-none">
            <p className="text-base font-semibold">
              &quot;{query}&quot; <span className="text-gray-400 font-normal">({visibleOpen.length + (showUpcoming ? visibleUpcoming.length : 0)})</span>
            </p>
            <button
              type="button"
              onClick={() => setShowSearchSheet(false)}
              aria-label="닫기"
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 text-base"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto scrollbar-hide">
            {[...visibleOpen, ...(showUpcoming ? visibleUpcoming : [])].length === 0 ? (
              <p className="text-base text-gray-400 text-center py-8">검색 결과가 없어요.</p>
            ) : (
              [...visibleOpen, ...(showUpcoming ? visibleUpcoming : [])].map((popup) => {
                const item = toPopupItem(popup);
                return (
                  <button
                    key={popup.id}
                    type="button"
                    onClick={() => {
                      setSelected(popup);
                      setShowSearchSheet(false);
                      // 선택은 지도 확대/위치에 영향 없음
                    }}
                    className="w-full flex flex-col items-start gap-1 px-4 py-3 border-b border-gray-50 dark:border-[#17181a] text-left"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={item.status} />
                      {item.location && <span className="text-sm text-gray-500">{item.location}</span>}
                    </div>
                    <p className="text-base font-medium truncate w-full">{popup.title}</p>
                    {item.dateRange && <p className="text-sm text-gray-400">{item.dateRange}</p>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 선택된 팝업 카드 - 카드 전체를 누르면 상세페이지로 이동 */}
      {selected && selectedItem && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="relative bg-white dark:bg-[#282B32] rounded-xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-gray-500 text-base shadow-sm"
            >
              ✕
            </button>
            <Link href={`/popup/${selected.id}`} className="flex items-stretch gap-3 p-3">
              {/* 이미지 크기 112px */}
              <div className="w-28 h-28 flex-none rounded-lg overflow-hidden bg-gray-100 dark:bg-[#282B32]">
                {selectedImageUrl ? (
                  <ImageWithFallback src={selectedImageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base text-gray-400">
                    이미지
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge status={selectedItem.status} />
                  {selectedItem.location && (
                    <span className="text-base text-gray-500">{selectedItem.location}</span>
                  )}
                </div>
                <p className="text-base font-semibold truncate">{selected.title}</p>
                {/* 별점/찜 개수 - 이름 아래 독립된 줄 */}
                {(selectedItem.avgRating != null || selectedWishlistCount !== null) && (
                  <div className="flex items-center gap-3">
                    {selectedItem.avgRating != null && (
                      <span className="flex items-center gap-1 text-base text-gray-500">
                        <StarRatingDisplay rating={Number(selectedItem.avgRating)} size={14} />
                        {Number(selectedItem.avgRating).toFixed(1)}
                      </span>
                    )}
                    {selectedWishlistCount !== null && (
                      <span className="flex items-center gap-1 text-base text-gray-500">
                        <img src="/icons/ui/heart.svg" alt="" width={14} height={14} />
                        {selectedWishlistCount}
                      </span>
                    )}
                  </div>
                )}
                {selectedItem.dateRange && (
                  <p className="text-base text-gray-400">{selectedItem.dateRange}</p>
                )}
                {/* 날짜 아래에 키워드 전체 표시 */}
                {(selected.keywordNames ?? []).length > 0 && (
                  <p className="text-base text-gray-400">{(selected.keywordNames ?? []).join(" · ")}</p>
                )}
              </div>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
