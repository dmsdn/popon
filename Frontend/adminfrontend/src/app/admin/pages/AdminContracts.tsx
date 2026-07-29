import { Fragment, useEffect, useState } from "react";
import { Loader2, FileSignature, ChevronRight, Info, Pencil, CheckCircle2 } from "lucide-react";
import { getPopups, getContract, setAdminContract, updateContractStage, Popup, ContractInfo } from "../../lib/api";
import { STAGE_FLOW, stageIndex, nextStage } from "../../lib/contractStages";

// 공간 대관·계약 관리 — 승인된 팝업의 파트너 공간 대관 계약을 관리자가 등록·진행.
// 계약체결 → 제작/시공 → 운영 중 → 철거/정산 4단계이며, 단계 확인·전환은 관리자의 의무/권한.
// 실연동: 계약금 등록(PUT /api/admin/popups/{id}/contract)·단계 전환(PATCH .../contract/stage)·조회
// 7/23: 백엔드 ContractStage에 OPERATING 추가 — 4단계 전부 서버 값 (로컬 「운영 중」 플래그 제거)

const fmtWon = (n: number) => n.toLocaleString("ko-KR") + "원";

type Row = { popup: Popup; contract: ContractInfo | null };

export default function AdminContracts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null); // 계약 등록/수정 폼 확장
  const [form, setForm] = useState({ amount: "", memo: "" });
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getPopups()
      .then(async (all) => {
        // 계약은 심사 승인된 팝업(BEFOR/OPEN/CLOSED) 대상
        const approved = all.filter((p) => p.status === "BEFOR" || p.status === "OPEN" || p.status === "CLOSED");
        const withContracts = await Promise.all(
          approved.map(async (popup) => {
            try {
              return { popup, contract: await getContract(popup.id) };
            } catch {
              return { popup, contract: null }; // 계약 미등록
            }
          }),
        );
        if (alive) setRows(withContracts);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const patchRow = (popupId: number, contract: ContractInfo) =>
    setRows((prev) => prev.map((r) => (r.popup.id === popupId ? { ...r, contract } : r)));

  // 계약 등록/수정 (등록 시 서버가 단계를 CONTRACTED로 시작)
  const submitContract = async (popupId: number) => {
    const amount = Number(form.amount.replaceAll(",", ""));
    if (!Number.isFinite(amount) || amount < 0) {
      alert("계약금을 숫자로 입력해 주세요.");
      return;
    }
    setActingId(popupId);
    try {
      const updated = await setAdminContract(popupId, { contractAmount: amount, memo: form.memo.trim() || undefined });
      patchRow(popupId, updated);
      setOpenId(null);
      setForm({ amount: "", memo: "" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "계약 등록에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  // 다음 단계 전환 — 4단계 전부 서버 PATCH (7/23 백엔드 OPERATING enum 추가로 로컬 플래그 제거)
  const advance = async (row: Row) => {
    if (!row.contract) return;
    const next = nextStage(row.contract.stage);
    if (!next) return;
    const nextLabel = STAGE_FLOW[stageIndex(next)].label;
    if (!window.confirm(`「${row.popup.title}」 계약을 「${nextLabel}」 단계로 전환할까요?`)) return;
    setActingId(row.popup.id);
    try {
      patchRow(row.popup.id, await updateContractStage(row.popup.id, next));
    } catch (e) {
      alert(e instanceof Error ? e.message : "단계 전환에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">공간 대관·계약 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          파트너 공간과 주최자의 대관 계약을 등록하고, 진행 단계를 확인·전환합니다. (단계 전환은 관리자 권한)
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          계약금 등록·단계 전환(계약체결/제작·시공/철거·정산)은 <strong>백엔드 실연동</strong>.
          계약완료 → 시공중 → 운영중 → 정산완료 4단계 모두 서버(ContractStage)에 저장됩니다.
          견적·디자인 확정 후 대관 계약이 체결된 팝업부터 등록하세요.
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      {!loading && (
        <div className="bg-white border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-[13px] min-w-[860px]">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">팝업명</th>
                <th className="text-left font-medium px-4 py-2.5">주최자</th>
                <th className="text-left font-medium px-4 py-2.5">파트너 공간</th>
                <th className="text-right font-medium px-4 py-2.5">계약금</th>
                <th className="text-left font-medium px-4 py-2.5">진행 단계</th>
                <th className="text-center font-medium px-4 py-2.5">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const { popup, contract } = row;
                const idx = contract ? stageIndex(contract.stage) : -1;
                const next = contract ? nextStage(contract.stage) : null;
                const open = openId === popup.id;
                return (
                  <Fragment key={popup.id}>
                    <tr className="hover:bg-secondary/40">
                      <td className="px-4 py-3 font-medium">{popup.title}</td>
                      <td className="px-4 py-3 text-xs">{popup.companyName}</td>
                      <td className="px-4 py-3 text-xs">{popup.location ?? "-"}</td>
                      <td className="px-4 py-3 text-right" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {contract ? fmtWon(contract.contractAmount) : <span className="text-muted-foreground text-xs">미등록</span>}
                      </td>
                      <td className="px-4 py-3">
                        {contract ? (
                          <div className="flex items-center gap-1">
                            {STAGE_FLOW.map((s, i) => (
                              <Fragment key={s.key}>
                                {i > 0 && <ChevronRight size={10} className="text-border shrink-0" />}
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                    i < idx
                                      ? "bg-secondary text-muted-foreground border-border"
                                      : i === idx
                                        ? "bg-accent text-white border-accent font-medium"
                                        : "border-border text-muted-foreground/40"
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">계약 등록 후 시작</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {!contract ? (
                            <button
                              onClick={() => { setOpenId(open ? null : popup.id); setForm({ amount: "", memo: "" }); }}
                              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm bg-accent text-white hover:bg-accent/90"
                            >
                              <FileSignature size={11} /> 계약 등록
                            </button>
                          ) : (
                            <>
                              {next ? (
                                <button
                                  onClick={() => advance(row)}
                                  disabled={actingId === popup.id}
                                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border border-accent/40 text-accent hover:bg-accent/5 disabled:opacity-40"
                                >
                                  {STAGE_FLOW[stageIndex(next)].label}로 전환 <ChevronRight size={10} />
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                                  <CheckCircle2 size={11} /> 완료
                                </span>
                              )}
                              <button
                                title="계약금 수정"
                                onClick={() => {
                                  setOpenId(open ? null : popup.id);
                                  setForm({ amount: String(contract.contractAmount), memo: contract.memo ?? "" });
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Pencil size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* 계약 등록/수정 폼 확장 행 */}
                    {open && (
                      <tr className="bg-secondary/30">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="max-w-xl bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
                            <div className="text-xs font-semibold">
                              {contract ? "계약금 수정" : "계약 등록"} — {popup.title}
                              <span className="font-normal text-muted-foreground ml-2">
                                공간: {popup.location ?? "미지정"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                                계약금 (원)
                                <input
                                  value={form.amount}
                                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                                  placeholder="예: 13500000"
                                  className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white w-40 text-right"
                                  style={{ fontFamily: "'DM Mono', monospace" }}
                                />
                              </label>
                              <label className="flex-1 min-w-[200px] flex flex-col gap-1 text-[11px] text-muted-foreground">
                                메모 (선택)
                                <input
                                  value={form.memo}
                                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                                  placeholder="예: 대관료 18일분 + 전기·통신 포함"
                                  className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white"
                                />
                              </label>
                              <button
                                onClick={() => submitContract(popup.id)}
                                disabled={actingId === popup.id}
                                className="text-xs px-4 py-2 rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50"
                              >
                                {actingId === popup.id ? "저장 중…" : "저장"}
                              </button>
                              <button onClick={() => setOpenId(null)} className="text-xs px-3 py-2 rounded-sm border border-border">
                                취소
                              </button>
                            </div>
                            {!contract && (
                              <p className="text-[11px] text-muted-foreground">
                                등록하면 「계약체결」 단계로 시작합니다. 이후 제작/시공 → 운영 중 → 철거/정산 순으로 전환하세요.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    승인된 팝업이 없습니다. 팝업 심사 승인 후 계약을 등록할 수 있습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
