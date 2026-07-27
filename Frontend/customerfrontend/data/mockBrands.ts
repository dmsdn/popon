export interface Brand {
  id: string;
  name: string;
  tagline: string;
  likeCount: number;
}

// TODO: 실제 서비스에서는 백엔드 브랜드 API로 교체해주세요.
export const brands: Brand[] = [
  { id: "musinsa", name: "무신사 스탠다드", tagline: "일상을 채우는 편안한 스탠다드", likeCount: 128 },
  { id: "sanrio", name: "산리오 카페", tagline: "귀여움 가득, 산리오와 함께하는 티타임", likeCount: 342 },
  { id: "tamburins", name: "탬버린즈", tagline: "향과 아름다움을 담은 브랜드", likeCount: 96 },
  { id: "pokemon", name: "포켓몬 ", tagline: "포켓몬과 함께하는 특별한 순간", likeCount: 512 },
];

export function findBrandById(id: string): Brand | undefined {
  return brands.find((b) => b.id === id);
}