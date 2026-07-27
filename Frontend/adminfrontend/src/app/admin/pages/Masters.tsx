import { useEffect, useState } from "react";
import { MapPin, Tags, Loader2, Info } from "lucide-react";
import { getRegions, Region } from "../../lib/api";

// 카테고리·지역 마스터
// 지역 = popup.address_keyword가 참조하는 region 테이블 (7/25 피드백: 공간(대관처) DB 탭 삭제 → 지역 마스터로 교체)
// 주최자가 팝업 주소를 등록하면 이 마스터의 지역 중 가장 가까운 곳이 자동으로 매핑된다(백엔드 지오코딩).
// 지역 추가/삭제 API는 아직 없어 조회 전용 — region 테이블은 백엔드 초기화 데이터(RegionDataInitializer)로 관리.

const CATEGORIES = [
  { name: "패션", tags: 24, popups: 11 },
  { name: "뷰티", tags: 18, popups: 8 },
  { name: "F&B", tags: 31, popups: 12 },
  { name: "캐릭터", tags: 27, popups: 9 },
  { name: "라이프스타일", tags: 15, popups: 5 },
  { name: "아트", tags: 12, popups: 2 },
  { name: "테크", tags: 9, popups: 1 },
];

export default function Masters() {
  const [tab, setTab] = useState<"regions" | "categories">("regions");
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch((e) => setError(e instanceof Error ? e.message : "지역 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">카테고리·지역 마스터 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">팝업에 적용될 카테고리·지역을 관리합니다.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["regions", "지역", MapPin], ["categories", "카테고리·태그", Tags]] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "regions" && (
        <>
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              지역은 팝업 DB의 <strong>address_keyword</strong>가 참조하는 표준 지역 카테고리입니다.
              주최자가 팝업 주소를 등록하면 아래 지역 중 <strong>가장 가까운 곳이 자동으로 설정</strong>되고,
              소비자의 관심 지역 필터·지역별 팝업 탐색이 이 값으로 동작합니다.
              지역 추가·삭제는 백엔드 초기화 데이터로 관리됩니다 (관리자 편집 API 백엔드 구성 후 연동).
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

          <div className="bg-white border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">등록된 지역 {regions.length}곳</span>
            </div>
            {loading ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
              </div>
            ) : regions.length === 0 && !error ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                등록된 지역이 없습니다. 백엔드 초기화 데이터(RegionDataInitializer)를 확인해 주세요.
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {regions.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 border border-border rounded-sm px-3 py-2.5">
                    <MapPin size={13} className="text-accent shrink-0" />
                    <span className="text-[13px] font-medium">{r.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                      #{r.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
              지역 목록은 백엔드 초기화 데이터(RegionDataInitializer)에서 관리합니다 — 상권 추가·변경은 그 목록을 수정하면 됩니다.
            </div>
          </div>
        </>
      )}

      {tab === "categories" && (
        <>
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              카테고리·태그 마스터 API가 아직 백엔드에 없습니다 — <strong>백엔드 구성 후 연동 필요</strong> (아래는 목업).
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="bg-white border border-border rounded-sm p-4">
                <div className="text-sm font-semibold mb-1">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">태그 {c.tags}개 · 사용 중 팝업 {c.popups}개</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
