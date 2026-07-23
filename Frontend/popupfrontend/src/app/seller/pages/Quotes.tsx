import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Loader2, Info, FileSignature, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMyPopups, getContract, Popup, ContractInfo } from "../../lib/api";
import { STAGE_FLOW, stageIndex } from "../../lib/contractStages";

// 견적·계약·진행 단계 — 계약(파트너 공간 대관) 진행 상황 실연동 (조회 전용)
// 전제: 견적·디자인이 확정되어 공간 대관 계약이 체결된 이후부터 단계가 시작됨.
// 단계 전환(계약체결→제작/시공→운영 중→철거/정산)은 플랫폼 관리자가 확인 후 처리.
// 견적 상담 항목은 백엔드 견적 API 구성 후 연동 — 현재 목업.

const QUOTE_ITEMS = [
  { item: "공간 대관료 (정형)", type: "정형", state: "계약금에 포함 — 아래 계약 정보 참고" },
  { item: "부스 디자인·시공비", type: "상담", state: "견적 상담 API 백엔드 구성 후 연동" },
  { item: "현장 보안·안전 인력", type: "상담", state: "견적 상담 API 백엔드 구성 후 연동" },
];

const fmtWon = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "-");

export default function Quotes() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractLoading, setContractLoading] = useState(false);

  useEffect(() => {
    if (!isBusiness) {
      setLoading(false);
      return;
    }
    getMyPopups()
      .then((list) => {
        // 계약은 승인된 팝업부터 — 승인된 것 우선 선택
        setPopups(list);
        const first = list.find((p) => p.status === "BEFOR" || p.status === "OPEN" || p.status === "CLOSED") ?? list[0];
        if (first) setPopupId(first.id);
      })
      .finally(() => setLoading(false));
  }, [isBusiness]);

  useEffect(() => {
    if (!popupId) return;
    setContractLoading(true);
    setContract(null);
    getContract(popupId)
      .then(setContract)
      .catch(() => setContract(null)) // 계약 미등록
      .finally(() => setContractLoading(false));
  }, [popupId]);

  if (!isBusiness) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">견적·계약·진행 단계</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          주최자(사업자) 계정으로 로그인해야 사용할 수 있습니다.{" "}
          <Link to="/login" state={{ from: "/seller/quotes" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      </div>
    );
  }

  // 7/23: OPERATING 포함 4단계 전부 서버 값 — 로컬 변환 없이 그대로 사용
  const curIdx = contract ? stageIndex(contract.stage) : -1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">견적·계약·진행 단계</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            파트너 공간 대관 계약의 진행 상황을 확인합니다. 단계 전환은 플랫폼 관리자가 처리합니다.
          </p>
        </div>
        {popups.length > 0 && (
          <select
            value={popupId ?? ""}
            onChange={(e) => setPopupId(Number(e.target.value))}
            className="px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
          >
            {popups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}
      {!loading && popups.length === 0 && (
        <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. <Link to="/seller/popups/new" className="text-accent underline underline-offset-2">팝업을 먼저 등록</Link>해 주세요.
        </div>
      )}

      {!loading && popupId && (
        <>
          {/* ── 계약 진행 단계 (실연동 · 조회 전용) ── */}
          <div className="bg-white border border-border rounded-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold">계약 진행 단계</span>
              {contract && (
                <span className="text-[11px] text-muted-foreground">
                  최근 변경 {fmtDate(contract.updatedAt)} · 담당 {contract.registeredBy.replace("admin:", "")}
                </span>
              )}
            </div>

            {contractLoading ? (
              <div className="text-center text-xs text-muted-foreground py-6">
                <Loader2 size={14} className="inline animate-spin mr-1.5" /> 계약 정보 확인 중…
              </div>
            ) : contract ? (
              <>
                {/* 4단계 스텝퍼: 계약체결 → 제작/시공 → 운영 중 → 철거/정산 */}
                <div className="flex items-start">
                  {STAGE_FLOW.map((s, i) => (
                    <div key={s.key} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <div className={`absolute top-3.5 right-1/2 w-full h-0.5 ${i <= curIdx ? "bg-accent" : "bg-border"}`} />
                      )}
                      <div
                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 ${
                          i < curIdx
                            ? "bg-accent border-accent text-white"
                            : i === curIdx
                              ? "bg-white border-accent text-accent"
                              : "bg-white border-border text-muted-foreground/50"
                        }`}
                      >
                        {i < curIdx ? <Check size={13} /> : i + 1}
                      </div>
                      <div className={`mt-2 text-xs font-medium ${i === curIdx ? "text-accent" : i < curIdx ? "" : "text-muted-foreground/60"}`}>
                        {s.label}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground text-center px-2 hidden sm:block">{s.desc}</div>
                    </div>
                  ))}
                </div>

                {/* 계약 정보 */}
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                  <div className="border border-border rounded-sm p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">계약금</div>
                    <div className="text-lg font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {fmtWon(contract.contractAmount)}
                    </div>
                  </div>
                  <div className="border border-border rounded-sm p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">계약 등록일</div>
                    <div className="text-sm font-medium">{fmtDate(contract.createdAt)}</div>
                  </div>
                  <div className="border border-border rounded-sm p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">메모</div>
                    <div className="text-xs leading-relaxed">{contract.memo || "-"}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5 bg-secondary/60 rounded-sm px-4 py-4">
                <FileSignature size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  아직 등록된 계약이 없습니다. 견적·디자인이 확정되고 파트너 공간과 대관 계약이 체결되면
                  플랫폼 관리자가 계약을 등록하며, 이후 이 화면에서 진행 단계를 확인할 수 있습니다.
                  <br />공간·비용 정보는 <Link to="/seller/venues" className="text-accent underline underline-offset-2">파트너 공간</Link>에서,
                  문의는 <Link to="/seller/inquiries" className="text-accent underline underline-offset-2">문의하기</Link>를 이용하세요.
                </div>
              </div>
            )}
          </div>

          {/* ── 견적 항목 (백엔드 구성 후 연동 — 목업) ── */}
          <div className="bg-white border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">견적 항목</span>
              <span className="text-[11px] text-amber-600 flex items-center gap-1">
                <Info size={11} /> 견적 상담 API 백엔드 구성 후 연동
              </span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">항목</th>
                  <th className="text-left font-medium px-4 py-2.5">유형</th>
                  <th className="text-left font-medium px-4 py-2.5">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {QUOTE_ITEMS.map((q) => (
                  <tr key={q.item}>
                    <td className="px-4 py-2.5">{q.item}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${q.type === "정형" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {q.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{q.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border">
              <Link to="/seller/inquiries" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline underline-offset-2">
                <MessageSquare size={12} /> 견적·계약 관련 문의하기
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
