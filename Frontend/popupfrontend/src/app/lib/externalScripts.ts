// 외부 지도·주소 스크립트 로더 (팝업등록 위치섹션용)
// 1) 다음 우편번호: 주소 검색팝업(키불필요) 
// 2) 네이버맵: 지도핀 표시+geocoder로 좌표변환(Client ID필요)
// 스크립트는 앱 생애 1회만 로드, 여러번 호출해도 같은 Promise 반환

const DAUM_POSTCODE_SRC = "https://t1.daum.net/postcode/api/mapjsapi/postcode.v2.js";
const NAVER_MAPS_BASE = "https://oapi.map.naver.com/openapi/v3/maps.js";

export const NAVER_MAP_CLIENT_ID: string = import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? "";

// 이미 로드했거나 로드 중인 스크립트를 src 기준으로 기억 (중복 삽입 방지)
const loading = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = loading.get(src);
  if (cached) return cached;

  const p = new Promise<void>((resolve, reject) => {
    // 다른 경로로 이미 붙어 있으면 그대로 사용
    if (document.querySelector(`script[data-ext-loader="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.dataset.extLoader = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`));
    document.head.appendChild(el);
  });

  loading.set(src, p);
  return p;
}

// ── 1) 다음 우편번호 ──
export function loadPostcode(): Promise<void> {
  return loadScript(DAUM_POSTCODE_SRC);
}

// ── 2) 네이버 지도 ──
// NCP 콘솔 버전에 따라 인증 파라미터 이름이 다르다(신규 ncpKeyId / 구 ncpClientId).
// 어느 쪽인지 코드가 알 수 없으므로 신규를 먼저 시도하고, 인증 실패 시 구 파라미터로 한 번 더 붙인다.
let naverMapsPromise: Promise<void> | null = null;

export function loadNaverMaps(): Promise<void> {
  if (naverMapsPromise) return naverMapsPromise;
  if (!NAVER_MAP_CLIENT_ID) {
    naverMapsPromise = Promise.reject(
      new Error("VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다. .env.local을 확인해 주세요."),
    );
    return naverMapsPromise;
  }

  naverMapsPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    // 네이버 지도는 인증 실패 시 전역 콜백으로만 알려준다 (스크립트 onerror가 아님)
    const tryLoad = (paramName: "ncpKeyId" | "ncpClientId", isLast: boolean) => {
      (window as unknown as Record<string, unknown>).navermap_authFailure = () => {
        if (isLast) {
          finish(() =>
            reject(
              new Error(
                "네이버 지도 인증에 실패했습니다. NCP 콘솔의 Application에 Web Dynamic Map이 켜져 있는지, " +
                  "「Web 서비스 URL」에 현재 주소(http://localhost:5174)가 등록됐는지 확인해 주세요.",
              ),
            ),
          );
        } else {
          tryLoad("ncpClientId", true); // 구 파라미터로 재시도
        }
      };

      loadScript(`${NAVER_MAPS_BASE}?${paramName}=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`)
        .then(() => {
          // 스크립트는 붙었지만 인증 실패면 위 콜백이 뒤늦게 불린다 → 짧게 기다렸다 확정
          setTimeout(() => {
            if (window.naver?.maps?.Service) finish(resolve);
            else if (isLast) finish(() => reject(new Error("네이버 지도 초기화에 실패했습니다.")));
          }, 300);
        })
        .catch((e) => {
          if (isLast) finish(() => reject(e));
          else tryLoad("ncpClientId", true);
        });
    };

    tryLoad("ncpKeyId", false);
  });

  return naverMapsPromise;
}

// 주소→좌표: 서버(GET /api/geocode) 우선, 실패시 브라우저 geocoder로 폴백
// [7/28] 서버경로는 secret key 보호+등록시 서버계산과 동일경로라 미리보기/저장 좌표 어긋남 없음, 브라우저경로는 백엔드 다운시 안전망
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const fromServer = await geocodeViaServer(address);
  if (fromServer) return fromServer;
  return geocodeViaBrowser(address);
}

async function geocodeViaServer(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null; // 404 = 못 찾음 또는 구버전 백엔드 → 브라우저 경로로
    const body = (await res.json()) as { latitude?: number; longitude?: number };
    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") return null;
    return { lat: body.latitude, lng: body.longitude };
  } catch {
    return null;
  }
}

function geocodeViaBrowser(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!window.naver?.maps?.Service) return resolve(null);
    window.naver.maps.Service.geocode({ query: address }, (status: string, response: NaverGeocodeResponse) => {
      if (status !== window.naver!.maps.Service.Status.OK) return resolve(null);
      const first = response?.v2?.addresses?.[0];
      if (!first) return resolve(null);
      resolve({ lat: Number(first.y), lng: Number(first.x) }); // x=경도, y=위도
    });
  });
}

// 주소 검색 결과 후보
export type AddressCandidate = {
  roadAddress: string;
  jibunAddress: string;
  postalCode: string;   // 우편번호 — 지오코딩 응답의 addressElements에서 뽑는다
  lat: number;
  lng: number;
};

// 네이버 지오코딩으로 주소 후보 목록을 받는다.
// 다음 우편번호 서비스가 막힌 환경(사내망·차단 등)에서 주소 검색 본 경로로 사용.
export async function searchAddressByNaver(query: string): Promise<AddressCandidate[]> {
  await loadNaverMaps();
  return new Promise((resolve) => {
    if (!window.naver?.maps?.Service) return resolve([]);
    window.naver.maps.Service.geocode({ query }, (status: string, response: NaverGeocodeResponse) => {
      if (status !== window.naver!.maps.Service.Status.OK) return resolve([]);
      const list = (response?.v2?.addresses ?? []).map((a) => ({
        roadAddress: a.roadAddress ?? "",
        jibunAddress: a.jibunAddress ?? "",
        postalCode: a.addressElements?.find((e) => e.types?.includes("POSTAL_CODE"))?.longName ?? "",
        lat: Number(a.y),
        lng: Number(a.x),
      }));
      resolve(list);
    });
  });
}

// ── 전역 타입 선언 (외부 스크립트라 d.ts가 없어 최소한만 정의) ──

type NaverAddressElement = { types?: string[]; longName?: string };
type NaverGeocodeResponse = {
  v2?: {
    addresses?: {
      x: string;
      y: string;
      roadAddress?: string;
      jibunAddress?: string;
      addressElements?: NaverAddressElement[];
    }[];
  };
};

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMap;
        Marker: new (opts: Record<string, unknown>) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Service: {
          geocode: (opts: { query: string }, cb: (status: string, res: NaverGeocodeResponse) => void) => void;
          Status: { OK: string };
        };
      };
    };
    daum?: {
      Postcode: new (opts: { oncomplete: (data: DaumPostcodeResult) => void; onclose?: () => void }) => {
        open: () => void;
      };
    };
  }
}

export type NaverMap = { setCenter: (latlng: unknown) => void; setZoom: (z: number) => void };

// 다음 우편번호 결과 — 필요한 필드만
export type DaumPostcodeResult = {
  roadAddress: string;    // 도로명 주소
  jibunAddress: string;   // 지번 주소
  zonecode: string;       // 우편번호 5자리
  buildingName?: string;
  bname?: string;         // 법정동
};
