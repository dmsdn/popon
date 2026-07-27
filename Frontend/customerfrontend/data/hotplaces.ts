// data/hotplaces.ts
//
// [결정] popup_hot_place는 백엔드 테이블+API가 있지만, 관리자용 업로드 화면이 없어서
// 데이터를 넣으려면 매번 SQL을 직접 만져야 했어요. 몇 개 안 되는 데이터를 지역
// 기준으로만 보여주면 되는 지금 요구사항엔 백엔드까지 갈 필요가 없다고 판단해서,
// 프론트 코드에 직접 데이터를 넣어두는 방식으로 바꿨어요.
//
// 나중에 데이터가 많아지거나 비개발자가 직접 관리해야 하는 시점이 오면, 그때
// popup_hot_place + 백엔드 API(이미 만들어둔 패치 있음)로 옮기면 돼요. 지금은
// 여기 배열에 항목 추가/수정하고 배포만 하면 바로 반영돼요.
//
// 매칭 기준: 팝업의 regionName(성수/강남/홍대 등, PopupDetail.regionName)과
// 아래 키가 일치하면 그 지역 리스트를 보여줍니다.

export interface HotPlace {
  category: string; // "카페" | "음식점" | "패션잡화" 등 자유 텍스트
  name: string;
  distance?: string; // 예: "114m" - 없으면 화면에 거리 표시 생략
  linkUrl?: string; // 네이버 지도 등 외부 링크
  imageUrl?: string; // 없으면 회색 placeholder로 자동 대체됨
}

export const hotPlacesByRegion: Record<string, HotPlace[]> = {
  성수: [
    { category: "카페", name: "카페 어니언 성수", linkUrl: "https://map.naver.com/v5/search/카페 어니언 성수" },
    { category: "카페", name: "대림창고", linkUrl: "https://map.naver.com/v5/search/대림창고" },
    { category: "음식점", name: "성수다락", linkUrl: "https://map.naver.com/v5/search/성수다락" },
    { category: "음식점", name: "홍익돈까스 성수", linkUrl: "https://map.naver.com/v5/search/홍익돈까스 성수" },
  ],
  홍대: [
    { category: "음식점", name: "옥동식", linkUrl: "https://map.naver.com/v5/search/옥동식" },
    { category: "음식점", name: "우와 홍대본점", linkUrl: "https://map.naver.com/v5/search/우와 홍대본점" },
    { category: "카페", name: "943 킹스크로스", linkUrl: "https://map.naver.com/v5/search/943 킹스크로스" },
  ],
  여의도: [
    { category: "음식점", name: "진주집", linkUrl: "https://map.naver.com/v5/search/진주집 여의도" },
    { category: "음식점", name: "하남돼지집 여의도", linkUrl: "https://map.naver.com/v5/search/하남돼지집 여의도" },
  ],
  용산: [
    { category: "음식점", name: "sam sam sam", linkUrl: "https://map.naver.com/v5/search/sam sam sam" },
    { category: "음식점", name: "도야집 용산본점", linkUrl: "https://map.naver.com/v5/search/도야집 용산본점" },
  ],
  강남: [
    { category: "카페", name: "런던베이글뮤지엄 도산점", linkUrl: "https://map.naver.com/v5/search/런던베이글뮤지엄 도산" },
    { category: "음식점", name: "정식당(Jungsik Seoul)", linkUrl: "https://naver.me/xv3DHt17" },
  ],
  잠실: [
    { category: "음식점", name: "신라제면 잠실 롯데몰점", linkUrl: "https://naver.me/5dAAXix0" },
    { category: "음식점", name: "진미평양냉면 잠실점", linkUrl: "https://map.naver.com/v5/search/진미평양냉면 잠실점" },
  ],
};

export function getHotPlacesForRegion(
  regionName?: string | null,
  location?: string | null
): HotPlace[] {
  // [수정] regionName(addressKeyword FK)이 최근에 생긴 필드라, 기존 팝업들은 대부분
  // 아직 이 값이 비어있고 location(자유 텍스트)만 채워져 있어요. regionName이 없으면
  // location 문자열 안에 지역 이름이 포함되어 있는지로 한 번 더 시도합니다.
  if (regionName && hotPlacesByRegion[regionName]) {
    return hotPlacesByRegion[regionName];
  }
  if (location) {
    const matched = Object.keys(hotPlacesByRegion).find((key) => location.includes(key));
    if (matched) return hotPlacesByRegion[matched];
  }
  return [];
}

// 홈 화면 "내 주변 핫플" 섹션용 - 각 지역의 대표 좌표(지하철역 기준 근사치)
export const regionCenters: Record<string, { lat: number; lng: number }> = {
  성수: { lat: 37.5445, lng: 127.0557 },
  홍대: { lat: 37.5563, lng: 126.9236 },
  여의도: { lat: 37.5219, lng: 126.9245 },
  용산: { lat: 37.5311, lng: 126.981 },
  강남: { lat: 37.4979, lng: 127.0276 },
  잠실: { lat: 37.5133, lng: 127.1001 },
};

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findNearestRegion(coords: { lat: number; lng: number }): string {
  let nearest = Object.keys(regionCenters)[0];
  let minDist = Infinity;
  for (const [region, center] of Object.entries(regionCenters)) {
    const dist = haversineDistance(coords, center);
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }
  return nearest;
}
