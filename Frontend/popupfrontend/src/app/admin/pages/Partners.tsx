import { useState } from "react";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

type PartnerState = "대기" | "승인" | "반려";

const INITIAL = [
  { id: "PT-1042", company: "㈜글로우랩", type: "브랜드", biz: "204-86-*****", manager: "김하영 매니저", applied: "07-14", docs: ["사업자등록증", "팝업 기획서"], state: "대기" as PartnerState },
  { id: "PT-1043", company: "빈컴퍼니", type: "브랜드", biz: "115-81-*****", manager: "박도현 대표", applied: "07-14", docs: ["사업자등록증", "팝업 기획서", "브랜드 소개서"], state: "대기" as PartnerState },
  { id: "PT-1044", company: "어반플레이스 에이전시", type: "대행사", biz: "312-87-*****", manager: "이수진 팀장", applied: "07-13", docs: ["사업자등록증"], state: "대기" as PartnerState },
  { id: "PT-1045", company: "㈜툰스튜디오", type: "브랜드", biz: "220-88-*****", manager: "정민규 매니저", applied: "07-12", docs: ["사업자등록증", "팝업 기획서"], state: "대기" as PartnerState },
  { id: "PT-1038", company: "제주스", type: "브랜드", biz: "616-82-*****", manager: "고은별 매니저", applied: "07-10", docs: ["사업자등록증", "팝업 기획서"], state: "승인" as PartnerState },
];

const BADGE: Record<PartnerState, string> = {
  대기: "bg-amber-50 text-amber-600 border-amber-200",
  승인: "bg-emerald-50 text-emerald-600 border-emerald-200",
  반려: "bg-red-50 text-red-500 border-red-200",
};

export default function Partners() {
  const [rows, setRows] = useState(INITIAL);
  const decide = (id: string, state: PartnerState) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, state } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">파트너(브랜드/대행사) 신청 승인</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          승인 시 파트너 전용 주최자센터 계정이 자동 발급되고 접근범위가 설정됩니다.
        </p>
      </div>

      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">신청번호</th>
              <th className="text-left font-medium px-4 py-2.5">업체명</th>
              <th className="text-left font-medium px-4 py-2.5">유형</th>
              <th className="text-left font-medium px-4 py-2.5">사업자번호</th>
              <th className="text-left font-medium px-4 py-2.5">담당자</th>
              <th className="text-left font-medium px-4 py-2.5">제출 서류</th>
              <th className="text-left font-medium px-4 py-2.5">신청일</th>
              <th className="text-left font-medium px-4 py-2.5">상태</th>
              <th className="text-center font-medium px-4 py-2.5">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{r.id}</td>
                <td className="px-4 py-3 font-medium">{r.company}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${r.type === "브랜드" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-purple-50 text-purple-600 border-purple-200"}`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.biz}</td>
                <td className="px-4 py-3 text-xs">{r.manager}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.docs.map((d) => (
                      <button key={d} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground hover:text-accent">
                        <FileText size={9} /> {d}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.applied}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${BADGE[r.state]}`}>{r.state}</span>
                </td>
                <td className="px-4 py-3">
                  {r.state === "대기" ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => decide(r.id, "승인")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700">
                        <CheckCircle2 size={11} /> 승인
                      </button>
                      <button onClick={() => decide(r.id, "반려")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50">
                        <XCircle size={11} /> 반려
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[11px] text-muted-foreground">{r.state === "승인" ? "계정 발급됨" : "안내 발송됨"}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
