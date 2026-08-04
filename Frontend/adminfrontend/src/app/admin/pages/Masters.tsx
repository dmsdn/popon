import { useEffect, useRef, useState } from "react";
import { MapPin, Tags, Loader2, Info, Plus, Trash2, Users, Image as ImageIcon, X } from "lucide-react";
import {
  getAdminKeywords, createAdminKeyword, deleteAdminKeyword,
  getAdminRegions, createAdminRegion, deleteAdminRegion,
  MasterItem,
} from "../../lib/api";

// 카테고리·지역 마스터 관리 — 7/29 실연동
// (그 전까지 지역은 조회 전용, 카테고리는 하드코딩 목업이었다.
//  7/27 jmy가 AdminKeywordController·AdminRegionController를 만들어뒀는데 프론트 연결이 없었다.)
//
// 여기서 관리하는 두 테이블이 서비스 전반에 쓰인다.
//   keyword : 주최자 팝업등록의 카테고리 선택 + 소비자 관심 카테고리 + 목록 카테고리 필터
//   region  : 팝업의 address_keyword(FK) + 소비자 관심 지역
// 그래서 삭제는 조용히 넘어가면 안 되는 동작이다. 몇 명이 그 항목을 관심으로 골랐는지(customerCount)를
// 같이 보여주고, 삭제 확인창에 그 숫자를 넣는다.
//
// ⚠ 백엔드에 수정(PUT)이 없다. 이름을 바꾸려면 삭제 후 재등록해야 하는데 삭제 시 소비자의
//   관심 선택도 함께 정리되므로, 오타 수정 목적으로 지우면 안 된다. 화면 하단에 그 점을 적어둔다.

type Tab = "regions" | "categories";

const TABS: { key: Tab; label: string; icon: typeof MapPin }[] = [
  { key: "regions", label: "지역", icon: MapPin },
  { key: "categories", label: "카테고리", icon: Tags },
];

export default function Masters() {
  const [tab, setTab] = useState<Tab>("regions");
  const [regions, setRegions] = useState<MasterItem[]>([]);
  const [keywords, setKeywords] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // "add" | "del:3"
  const inputRef = useRef<HTMLInputElement>(null);

  // 카테고리 아이콘 (8/4) — 선택 사항이다.
  // 안 올리면 소비자 앱이 이름 규칙으로 lucide 아이콘을 고른다(popupCategoryIcon.ts).
  // 기존 8개 카테고리가 그 폴백을 쓰고 있어서, 아이콘을 필수로 만들면 그것들만 빈칸이 된다.
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!iconFile) {
      setIconPreview(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url); // objectURL은 해제해야 메모리가 새지 않는다
  }, [iconFile]);
  const clearIcon = () => {
    setIconFile(null);
    if (iconRef.current) iconRef.current.value = ""; // 같은 파일을 다시 고를 수 있게 비운다
  };

  useEffect(() => {
    Promise.all([getAdminRegions(), getAdminKeywords()])
      .then(([rs, ks]) => {
        setRegions(rs);
        setKeywords(ks);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "마스터 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const isRegion = tab === "regions";
  const items = isRegion ? regions : keywords;
  const unit = isRegion ? "지역" : "카테고리";

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (items.some((i) => i.name === name)) return alert(`이미 있는 ${unit}입니다.`);
    setBusy("add");
    try {
      const created = isRegion ? await createAdminRegion(name) : await createAdminKeyword(name, iconFile);
      // 생성 응답에는 customerCount가 없다(방금 만들었으니 0) — 목록 모양을 맞춰 직접 채운다
      const row: MasterItem = {
        id: created.id,
        name: created.name,
        customerCount: 0,
        iconUrl: (created as MasterItem).iconUrl ?? null,
      };
      if (isRegion) setRegions((prev) => [...prev, row]);
      else setKeywords((prev) => [...prev, row]);
      setNewName("");
      clearIcon();
      inputRef.current?.focus(); // 여러 개를 연달아 넣는 일이 많아 포커스를 남긴다
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: MasterItem) => {
    const warn = item.customerCount > 0
      ? `\n\n이 ${unit}을(를) 관심으로 선택한 소비자 ${item.customerCount}명의 설정도 함께 지워집니다.`
      : "";
    if (!window.confirm(`「${item.name}」을(를) 삭제할까요?${warn}\n\n이름만 바꾸려는 거라면 삭제하지 마세요 — 되돌릴 수 없습니다.`)) return;
    setBusy(`del:${item.id}`);
    try {
      if (isRegion) await deleteAdminRegion(item.id);
      else await deleteAdminKeyword(item.id);
      if (isRegion) setRegions((prev) => prev.filter((x) => x.id !== item.id));
      else setKeywords((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e) {
      // 지역은 popup.address_keyword가 참조 중이면 FK 제약에 막힌다 (백엔드 의도된 동작)
      alert(e instanceof Error ? e.message : `삭제에 실패했습니다. 이 ${unit}을(를) 쓰는 팝업이 있는지 확인해 주세요.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold">카테고리·지역 마스터 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          주최자 팝업등록의 선택지와 소비자 관심 설정에 바로 반영됩니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setNewName(""); }}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === key ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
            <span className="text-[11px] text-muted-foreground">{key === "regions" ? regions.length : keywords.length}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center gap-2">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={isRegion ? "추가할 지역 이름 (예: 성수)" : "추가할 카테고리 이름 (예: 라이프스타일)"}
            className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
          />
          {/* 아이콘은 카테고리에만 붙는다 — 지역은 소비자 화면에서 아이콘을 쓰지 않는다 (8/4) */}
          {!isRegion && (
            <>
              <input
                ref={iconRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {iconPreview ? (
                <button
                  type="button"
                  onClick={clearIcon}
                  title="아이콘 제거"
                  className="flex items-center gap-1.5 text-xs px-2 py-1 border border-border rounded-sm hover:border-red-400 hover:text-red-500 shrink-0"
                >
                  <img src={iconPreview} alt="" className="w-5 h-5 object-contain" />
                  <X size={11} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => iconRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-sm hover:border-accent hover:text-accent shrink-0"
                >
                  <ImageIcon size={12} /> 아이콘 (선택)
                </button>
              )}
            </>
          )}
          <button
            onClick={add}
            disabled={busy === "add" || !newName.trim()}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 shrink-0"
          >
            {busy === "add" ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} 추가
          </button>
        </div>
        {!isRegion && (
          <div className="px-4 py-2 border-b border-border text-[11px] text-muted-foreground">
            아이콘을 올리지 않으면 소비자 화면이 카테고리 이름에 맞는 기본 아이콘을 자동으로 고릅니다.
            이름이 규칙에 없으면 「기타」 아이콘이 되므로, 새 카테고리는 아이콘을 함께 올리는 편이 좋습니다.
          </div>
        )}

        {loading ? (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">
            <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-muted-foreground">등록된 {unit}이(가) 없습니다.</li>
            )}
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40">
                <span className="w-8 text-xs text-muted-foreground shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {item.id}
                </span>
                {/* 카테고리는 등록된 아이콘을 보여 준다 — 없으면 소비자 화면이 이름 규칙으로 폴백한다 (8/4) */}
                {!isRegion && (
                  item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center shrink-0" title="등록된 아이콘 없음 — 기본 아이콘으로 표시됩니다">
                      <ImageIcon size={11} className="text-muted-foreground" />
                    </span>
                  )
                )}
                <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{item.name}</span>
                <span
                  className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0"
                  title="이 항목을 관심으로 선택한 소비자 수"
                >
                  <Users size={11} /> {item.customerCount}
                </span>
                <button
                  onClick={() => remove(item)}
                  disabled={busy === `del:${item.id}`}
                  title={`${unit} 삭제`}
                  className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                >
                  {busy === `del:${item.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-1.5 px-4 py-3 bg-secondary/40 border border-border rounded-sm text-[11px] text-muted-foreground leading-relaxed">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          <strong className="text-foreground">이름 수정 기능은 없습니다.</strong> 오타를 고치려고 삭제하면 그 {unit}을(를)
          관심으로 고른 소비자의 설정까지 함께 지워집니다. 새로 추가하고 기존 것은 두는 편이 안전합니다.
          {isRegion && " 또한 팝업이 사용 중인 지역은 삭제되지 않습니다."}
        </span>
      </div>
    </div>
  );
}
