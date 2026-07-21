import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Building2, CalendarRange, TrainFront, Store, Info } from "lucide-react";
import { getVenues, getPopups, Venue, Popup } from "../../lib/api";

// 파트너 공간 — 대관 가능한 파트너 공간의 정보·예약 스케줄·예상 비용을 한눈에.
// 실연동: 공간 목록(이름·주소·면적·일 대관료·사진·상태 — 관리자 공간 마스터), 공간별 예약 현황(해당 공간에서 열리는 팝업 기간)
// 데모: 주변 시설·역 도보 정보는 공간 마스터에 필드가 없어 데모 표기 (백엔드 확장 시 교체)

const fmtWon = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

// 주변 시설·교통 데모 데이터 — 공간 마스터에 해당 필드 추가 시 서버 값으로 교체 (팀 전달)
const NEARBY_DEMO: { match: string; station: string; facilities: string[] }[] = [
  { match: "성수", station: "성수역 2번 출구 도보 5분 · 뚝섬역 도보 9분", facilities: ["주차장(건물 지하 2시간 무료)", "카페거리 도보 3분", "편의점 1분", "서울숲 도보 10분"] },
  { match: "홍대", station: "홍대입구역 9번 출구 도보 4분", facilities: ["공영주차장 도보 5분", "먹자골목 인접", "편의점 1분"] },
  { match: "강남", station: "강남역 11번 출구 도보 6분", facilities: ["건물 내 주차장", "카페·식당가 인접", "약국·편의점 2분"] },
];
const NEARBY_FALLBACK = { station: "인근 지하철역 도보 10분 이내 (상세 정보 등록 예정)", facilities: ["주차·편의시설 정보 등록 예정"] };

const nearbyOf = (v: Venue) =>
  NEARBY_DEMO.find((n) => v.name.includes(n.match) || v.address.includes(n.match)) ?? NEARBY_FALLBACK;

// 운영 2주(14일) 기준 예상 대관료 — 시공·인력 등 부대비용 제외
const ESTIMATE_DAYS = 14;

export default function PartnerVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getVenues(), getPopups()])
      .then(([vs, ps]) => {
        setVenues(vs);
        setPopups(ps);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "공간 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  // 공간별 예약 스케줄: 팝업 등록 시 location에 공간 라벨("이름 (면적㎡)")이 저장되므로 이름 포함으로 매칭
  const scheduleOf = useMemo(() => {
    return (v: Venue) =>
      popups
        .filter((p) => p.location?.includes(v.name) && p.status !== "REJECTED")
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  }, [popups]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">파트너 공간</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          팝업온 파트너 공간의 정보·예약 현황·예상 비용을 확인하고, 팝업 등록 시 원하는 공간을 선택하세요.
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          공간 정보·예약 현황은 <strong>실데이터</strong>(관리자 공간 마스터·등록 팝업 기준).
          주변 시설·역 도보 정보는 공간 마스터에 필드가 없어 <strong>데모 표기</strong>입니다.
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}
      {!loading && venues.length === 0 && !error && (
        <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 파트너 공간이 없습니다. (관리자 공간 마스터에서 등록됩니다)
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {venues.map((v) => {
          const schedule = scheduleOf(v);
          const nearby = nearbyOf(v);
          const available = v.status === "AVAILABLE";
          return (
            <div key={v.id} className="bg-white border border-border rounded-sm overflow-hidden flex flex-col">
              {/* 미리보기 사진 */}
              {v.imageUrl ? (
                <img src={v.imageUrl} alt={v.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-secondary to-border flex flex-col items-center justify-center text-muted-foreground">
                  <Building2 size={28} />
                  <span className="text-[11px] mt-1.5">공간 사진 등록 예정</span>
                </div>
              )}

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{v.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {v.address}
                      {v.areaSqm != null && <span>· {v.areaSqm}㎡</span>}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${
                      available ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    {available ? "대관 가능" : "대관 불가"}
                  </span>
                </div>

                {v.description && <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>}

                {/* 예상 비용 */}
                <div className="bg-secondary/50 rounded-sm px-3 py-2.5">
                  <div className="text-[11px] text-muted-foreground mb-0.5">예상 평균 총 비용 (운영 {ESTIMATE_DAYS}일 기준, 대관료만)</div>
                  {v.rentalFee != null ? (
                    <div className="text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {fmtWon(v.rentalFee * ESTIMATE_DAYS)}
                      <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
                        (일 {fmtWon(v.rentalFee)} · 시공·인력 등 부대비용 제외)
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">대관료 정보 미등록 — 견적 문의로 확인</div>
                  )}
                </div>

                {/* 예약 현황 (해당 공간에서 열리는 팝업 스케줄) */}
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold mb-1.5">
                    <CalendarRange size={12} className="text-accent" /> 예약 현황
                  </div>
                  {schedule.length === 0 ? (
                    <p className="text-[11px] text-emerald-600">현재 예약된 일정이 없습니다 — 전 기간 신청 가능</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {schedule.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-[11px]">
                          <Store size={10} className="text-muted-foreground shrink-0" />
                          <span style={{ fontFamily: "'DM Mono', monospace" }}>
                            {fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}
                          </span>
                          <span className="text-muted-foreground truncate">
                            {p.status === "PENDING" ? "예약 심사 중" : "예약됨"} · {p.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 위치·주변 시설 (데모) */}
                <div className="mt-auto pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <TrainFront size={11} className="text-muted-foreground shrink-0" /> {nearby.station}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {nearby.facilities.map((f) => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
