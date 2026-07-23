import { useEffect, useState } from "react";
import { Loader2, Info } from "lucide-react";
import { getPopups, Popup } from "../../lib/api";

// 주최자(사업자) 회원 관리
// 연동됨(부분): 팝업 등록 이력(GET /api/popups)에서 파생한 주최자별 현황 집계
// 연동 필요: 주최자 전체 목록·상세(이메일/사업자번호/연락처/가입일)·제재/정지 — 관리자용 주최자 조회 API가 백엔드에 없음

type BizRow = {
  businessId: number;
  companyName: string;
  total: number;
  published: number; // BEFOR + OPEN
  pending: number;
  rejected: number;
  lastCreatedAt: string;
};

function aggregate(popups: Popup[]): BizRow[] {
  const map = new Map<number, BizRow>();
  for (const p of popups) {
    const row = map.get(p.businessId) ?? {
      businessId: p.businessId,
      companyName: p.companyName,
      total: 0, published: 0, pending: 0, rejected: 0,
      lastCreatedAt: p.createdAt,
    };
    row.total += 1;
    if (p.status === "BEFOR" || p.status === "OPEN") row.published += 1;
    if (p.status === "PENDING") row.pending += 1;
    if (p.status === "REJECTED") row.rejected += 1;
    if (p.createdAt > row.lastCreatedAt) row.lastCreatedAt = p.createdAt;
    map.set(p.businessId, row);
  }
  return [...map.values()].sort((a, b) => b.lastCreatedAt.localeCompare(a.lastCreatedAt));
}

export default function Businesses() {
  const [rows, setRows] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getPopups()
      .then((all) => alive && setRows(aggregate(all)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">주최자 회원 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          주최자(브랜드·대행사) 계정 현황을 관리합니다. 주최자는 일반 가입 즉시 활성화되며, 등록 팝업은 건별 심사를 거칩니다.
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          아래 목록은 <strong>팝업 등록 이력 기반 파생 데이터</strong>입니다 (팝업을 1건 이상 등록한 주최자만 표시).
          주최자 전체 목록·상세정보(이메일/사업자번호/연락처/가입일)·제재/정지 기능은
          관리자용 주최자 조회 API가 백엔드에 없어 <strong>백엔드 구성 후 연동 필요</strong>합니다.
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">팝업 등록 주최자 {rows.length}사</span>
        </div>
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">브랜드명</th>
              <th className="text-right font-medium px-4 py-2.5">등록 팝업</th>
              <th className="text-right font-medium px-4 py-2.5">게시중</th>
              <th className="text-right font-medium px-4 py-2.5">심사 대기</th>
              <th className="text-right font-medium px-4 py-2.5">반려</th>
              <th className="text-left font-medium px-4 py-2.5">최근 등록일</th>
              <th className="text-center font-medium px-4 py-2.5">관리 (제재/정지)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </td>
              </tr>
            )}
            {!loading && rows.map((b) => (
              <tr key={b.businessId} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{b.businessId}</td>
                <td className="px-4 py-3 font-medium">{b.companyName}</td>
                <td className="px-4 py-3 text-right">{b.total}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{b.published}</td>
                <td className="px-4 py-3 text-right text-blue-600">{b.pending}</td>
                <td className="px-4 py-3 text-right text-red-500">{b.rejected}</td>
                <td className="px-4 py-3 text-xs">{b.lastCreatedAt.slice(0, 10)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    disabled
                    title="주최자 제재/정지 API 백엔드 구성 후 연동 필요"
                    className="text-[11px] px-2 py-1 rounded-sm border border-border text-muted-foreground opacity-40 cursor-not-allowed"
                  >
                    연동 필요
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">팝업을 등록한 주최자가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
