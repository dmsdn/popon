"use client";

// 지도로 팝업 찾기 페이지 - 네이버 지도에 마커를 찍고, 선택한 팝업 카드를 하단에 보여줘요.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { searchPopups, getPopupImages, getPopupWishlistCount, type PopupDetail } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
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

// [신규] 같은 건물처럼 좌표가 사실상 같은 팝업이 여러 개 있으면 핀이 완전히
// 겹쳐서 뒤에 있는 핀은 누를 수가 없었어요. 좌표를 살짝 반올림해서 그룹으로
// 묶고, 한 그룹에 2개 이상이면 주변에 무작위로 흩어 놓아서 각각 보이고
// 눌리게 만들었어요. (매번 다른 위치로 튀면 헷갈리니까, 같은 항목은 항상
// 같은 자리에 오도록 좌표 기반으로 "고정된" 무작위값을 만들어요.)
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
    // 소수점 4자리 ≈ 약 11m 반경 - 이 정도면 "같은 건물"로 취급해도 될 거리예요.
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
    // 여러 개면 반경 약 9~22m 사이 랜덤한 거리·방향으로 흩어 놔요. 원형으로
    // 가지런히 배치하면 너무 기계적으로 보인다는 피드백이 있어서, 대신
    // 자연스럽게 흩뿌려진 느낌이 나도록 바꿨어요.
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

// [신규] 화면이 조금만 줄어들어도(축소돼도) 핀들이 서로 겹쳐서 원하는 팝업을
// 고르기 어렵다는 피드백을 반영했어요. 위/경도 거리가 아니라 "지금 화면에
// 실제로 보이는 픽셀 거리"를 기준으로 가까운 핀들을 하나의 클러스터(숫자
// 뱃지)로 묶고, 그 뱃지를 누르면 그 위치로 확대해서 각 핀이 다시 따로
// 눌릴 수 있게 퍼지도록 했어요. 지도를 옮기거나 확대/축소할 때마다(idle
// 이벤트) 다시 계산돼요.
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
    // 픽셀 좌표를 CLUSTER_PIXEL_SIZE 크기의 격자로 나눠서, 같은 칸에 들어오면
    // 같은 클러스터로 묶어요. 격자 방식이라 아주 드물게 경계에 걸친 두 핀이
    // 다른 칸으로 나뉠 수 있지만, 대부분의 경우엔 충분히 잘 묶여요.
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
  // [신규] 검색 결과 목록을 바텀시트로 보여줄지 여부. 검색어를 입력하면 자동으로
  // 열리고, 목록에서 팝업을 고르거나 지도에서 마커를 누르면 닫혀요(그 팝업
  // 카드만 보여주기 위해). X 버튼으로 직접 닫을 수도 있어요.
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  // [신규] 지도를 옮기거나(드래그) 확대/축소할 때마다 값이 바뀌어서, 아래
  // 마커/클러스터 렌더링 이펙트가 다시 실행되게 만드는 트리거예요. 데이터
  // 자체는 안 바뀌지만 "화면에서 핀들이 얼마나 가까워 보이는지"는 바뀌니까
  // 클러스터를 다시 계산해야 해요.
  const [viewTick, setViewTick] = useState(0);

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

  // [신규] 검색어를 입력하면 바텀시트를 열고, 특정 팝업 선택은 해제해요
  // (검색 중엔 "이 검색어에 맞는 전체 목록"을 보여주는 게 우선이라).
  // 검색어를 지우면 바텀시트도 같이 닫혀요.
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
        // [수정] 배열 맨 앞 대신 type === "THUMBNAIL"로 대표 이미지를 골라요.
        // (상세 이미지만 있는 팝업에서 배열 순서에 따라 상세 이미지가 대표
        // 자리에 뜨는 버그 방지. 옛 데이터 대비 폴백은 유지)
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
    // [신규] 드래그/확대/축소가 끝날 때마다(idle) 클러스터를 다시 계산해요.
    window.naver.maps.Event.addListener(mapInstance.current, "idle", () => {
      setViewTick((v) => v + 1);
    });
  }, [sdkReady, openPopups]);

  // 마커 렌더링 - 진행중(검정 핀)이 우선, 운영예정(회색 핀)은 토글 켰을 때만.
  // 핀마다 팝업 이름을 작은 라벨로 같이 보여줘요.
  useEffect(() => {
    if (!sdkReady || !window.naver?.maps || !mapInstance.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const targets = spreadOverlappingPositions([
      ...visibleOpen.map((p) => ({ popup: p, active: true })),
      ...(showUpcoming ? visibleUpcoming.map((p) => ({ popup: p, active: false })) : []),
    ].map((t) => ({ ...t, latitude: t.popup.latitude!, longitude: t.popup.longitude! })));

    // [신규] 좌표만으로는 "화면에서 얼마나 가까워 보이는지"를 알 수 없어서,
    // 실제 픽셀 거리로 다시 그룹을 묶어요. 한 그룹에 핀이 1개뿐이면 지금까지
    // 처럼 이름표 붙은 핀으로, 2개 이상이면 숫자 뱃지(클러스터)로 보여줘요.
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
        // 클러스터를 누르면 그 위치로 확대해서 핀들이 각자 눌릴 수 있을
        // 만큼 퍼지게 해요. (선택 자체는 하지 않고, 확대까지만.)
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
        // [수정] 검색 시 겹쳐있던 마커들 사이에서 선택된 마커가 다른 마커에
        // 가려지던 문제 - 렌더링 순서에만 의존하지 않고 zIndex를 명시적으로
        // 줘서, 선택된 마커가 항상 맨 위에 그려지도록 했어요.
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

  // [수정] "팝업을 선택하면 지도가 축소된다"는 문제의 원인을 찾았어요 - 검색 시
  // 지도 중심을 옮기는 코드가 마커 렌더링 이펙트 안에 있었는데, 그 이펙트가
  // selected?.id 변화에도 다시 실행되고 있었어요. 그래서 검색어를 입력해둔
  // 상태에서 마커/목록을 눌러 "선택"만 해도 이 블록이 다시 돌면서 확대 수준을
  // 강제로 15로 되돌리고 있었던 거예요. 이제 검색어(q) 자체가 바뀔 때만
  // 실행되는 별도 이펙트로 분리해서, 팝업을 선택하는 동작은 지도 확대/위치에
  // 전혀 영향을 안 주도록 했어요.
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

      {/* [신규] 검색 결과 바텀시트 - 검색어에 맞는 팝업이 여러 개면 전체를
          목록으로 보여줘요. 화면을 꽉 채우지 않고 아래에서 올라오는 시트로만. */}
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
                      // [수정] 여기서도 setCenter/setZoom을 강제로 걸고 있어서,
                      // 목록에서 팝업을 고르기만 해도 지도가 축소/이동됐어요.
                      // 이제 선택은 지도 확대/위치에 전혀 영향을 안 줘요 - 보고
                      // 있던 화면 그대로 유지돼요.
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
              {/* [수정] 이미지가 너무 작아서 80px → 112px로 키웠어요. */}
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
                {/* [수정] 별점/찜 개수를 상태·지역 줄에 끼워 넣지 않고, 이름 바로
                    아래에 독립된 줄로 분리해서 눈에 잘 띄게 했어요. */}
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
