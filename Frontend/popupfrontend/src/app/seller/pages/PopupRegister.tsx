import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  FileText, MapPin, Image as ImageIcon, AlignLeft, CalendarClock,
  Ticket, Upload, Plus, X, Info, CheckCircle2,
} from "lucide-react";
import { createPopup, updatePopup, getPopup, uploadPopupImage } from "../../lib/api";
import { ensureSlots } from "../../lib/slotAutoGen";
import { loadOpsMode, saveOpsMode, OpsMode } from "../../lib/walkinQueue";

// 운영 기간 기본값: 시작일 = 작성 당일, 종료일 = 2주 뒤
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const twoWeeksLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
};

const OPS_MODE_LABEL: Record<OpsMode, string> = {
  RESERVATION: "사전예약만",
  WALKIN: "현장 웨이팅만",
  BOTH: "둘 다 운영",
};

const CATEGORIES = ["패션", "뷰티", "F&B", "캐릭터", "라이프스타일", "아트", "테크", "엔터테인먼트"];
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const SECTIONS = [
  { id: "basic", icon: FileText, label: "기본 정보" },
  { id: "schedule", icon: CalendarClock, label: "운영 기간·시간" },
  { id: "location", icon: MapPin, label: "위치·공간" },
  { id: "media", icon: ImageIcon, label: "이미지·미디어" },
  { id: "detail", icon: AlignLeft, label: "상세 설명" },
  { id: "entry", icon: Ticket, label: "예약·입장 정책" },
];

// 이미지 업로드 제한: JPG만 · 장당 최대 10MB (7/24 회의 결정 — 형식 강제, 서버 리사이즈 파이프라인과 통일)
const MAX_IMAGE_MB = 10;
function filterJpegs(files: File[]): { ok: File[]; rejected: string[] } {
  const ok: File[] = [];
  const rejected: string[] = [];
  for (const f of files) {
    if (f.type !== "image/jpeg") rejected.push(`${f.name} — JPG 형식만 업로드할 수 있습니다`);
    else if (f.size > MAX_IMAGE_MB * 1024 * 1024)
      rejected.push(`${f.name} — ${(f.size / 1024 / 1024).toFixed(1)}MB (최대 ${MAX_IMAGE_MB}MB)`);
    else ok.push(f);
  }
  return { ok, rejected };
}

const inputCls =
  "w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent placeholder:text-muted-foreground/60";
const labelCls = "block text-xs font-medium mb-1.5";
const Req = () => <span className="text-red-500 ml-0.5">*</span>;

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white border border-border rounded-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="p-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

export default function PopupRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id"); // 있으면 수정 모드
  const [cats, setCats] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  // 운영 방식(사전예약만/현장 웨이팅만/둘 다) — 대기열·인원 관제와 공유 (localStorage, 백엔드 구성 후 연동)
  const [opsMode, setOpsMode] = useState<OpsMode>("BOTH");
  const useReservation = opsMode !== "WALKIN"; // 사전예약 포함 여부 → 슬롯 자동 생성 대상
  const [images, setImages] = useState<File[]>([]);
  // 상세 설명용 세로형 JPG 1장 (쿠팡 상품 상세 스타일)
  const [detailImage, setDetailImage] = useState<File | null>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sameHours, setSameHours] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 백엔드 연동 필드
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => toDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => toDateStr(twoWeeksLater()));
  const [openTime, setOpenTime] = useState("11:00");
  const [closeTime, setCloseTime] = useState("20:00");
  // 예약 정책 (백엔드 필수: reservationMode·avgExperienceMinutes) — 슬롯은 이 값 기준 자동 생성
  const [slotUnit, setSlotUnit] = useState(30); // 슬롯 단위(분) = 체험 소요시간
  const [slotCapacity, setSlotCapacity] = useState(10); // 슬롯당 예약 정원 (자동 생성 시 사용)
  // 서버는 capacity·areaSqm 둘 다 없으면 400이므로 (PopupService.create) 최대 정원은 필수 입력·전송
  const [maxCapacity, setMaxCapacity] = useState(120); // 동시 수용 정원
  const [slotProgress, setSlotProgress] = useState(""); // 자동 생성 진행 안내
  const [directAddress, setDirectAddress] = useState("");

  // 수정 모드: 기존 팝업 불러와서 폼 채우기
  useEffect(() => {
    if (!editId) return;
    getPopup(editId)
      .then((p) => {
        setTitle(p.title);
        setDescription(p.description);
        if (p.startDate) {
          setStartDate(p.startDate.slice(0, 10));
          setOpenTime(p.startDate.slice(11, 16) || "11:00");
        }
        if (p.endDate) {
          setEndDate(p.endDate.slice(0, 10));
          setCloseTime(p.endDate.slice(11, 16) || "20:00");
        }
        // 운영 방식 복원: 서버 queueMode 우선(7/24 DTO 연동), 없는 구 팝업만 로컬 저장 폴백
        if (p.reservationMode === "FREE") setOpsMode("WALKIN");
        else if (p.queueMode === "PRERESERVATION_ONLY") setOpsMode("RESERVATION");
        else if (p.queueMode === "ONSITE_WAITING_ONLY") setOpsMode("WALKIN");
        else if (p.queueMode === "BOTH") setOpsMode("BOTH");
        else if (p.reservationMode === "SLOT") {
          const saved = loadOpsMode(p.id);
          setOpsMode(saved === "WALKIN" ? "BOTH" : saved);
        }
        if (p.avgExperienceMinutes) setSlotUnit(p.avgExperienceMinutes);
        if (p.location) setDirectAddress(p.location);
        if (p.capacity) setMaxCapacity(p.capacity);
        if (p.hashtags?.length) setTags(p.hashtags); // 7/27 서버 해시태그 복원
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 정보를 불러오지 못했습니다."));
  }, [editId]);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) return setError("팝업명을 입력해 주세요.");
    if (!description.trim()) return setError("상세 설명을 입력해 주세요.");
    if (!startDate || !endDate) return setError("운영 기간(시작일·종료일)을 입력해 주세요.");
    if (!maxCapacity || maxCapacity < 1) return setError("최대 수용 정원을 입력해 주세요.");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      location: directAddress.trim(),
      startDate: `${startDate}T${openTime}:00`,
      endDate: `${endDate}T${closeTime}:00`,
      // 서버가 capacity·areaSqm 둘 다 없으면 400을 던지므로 (PopupService.create) capacity는 필수 전송
      capacity: maxCapacity,
      // 7/27 jmy 해시태그 — 화면의 태그 입력을 서버에 실저장 (소비자 검색 노출)
      hashtags: tags,
      reservationMode: (useReservation ? "SLOT" : "FREE") as "SLOT" | "FREE",
      avgExperienceMinutes: slotUnit,
      // 7/24 jsw DTO 추가분 — 서버 필수 필드. 화면의 운영 방식(OpsMode)을 서버 enum으로 변환해 전송
      queueMode: (opsMode === "RESERVATION"
        ? "PRERESERVATION_ONLY"
        : opsMode === "WALKIN"
          ? "ONSITE_WAITING_ONLY"
          : "BOTH") as "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH",
    };

    setSubmitting(true);
    try {
      const popup = editId ? await updatePopup(editId, payload) : await createPopup(payload);
      saveOpsMode(popup.id, opsMode); // 대기열·인원 관제가 이 값을 읽어 표시
      for (const file of images) {
        await uploadPopupImage(popup.id, file);
      }
      // 상세 설명 이미지 — 백엔드에 썸네일/상세 구분이 없어 팝업 이미지로 함께 업로드
      if (detailImage) {
        await uploadPopupImage(popup.id, detailImage);
      }
      // 사전예약제(SLOT)면 서버가 운영기간 × 운영시간 × 슬롯 단위로 예약 슬롯 일괄 생성 (멱등)
      if (useReservation) {
        setSlotProgress("운영시간 기준 예약 슬롯 자동 생성 중…");
        const { created, keptStale } = await ensureSlots(popup, slotCapacity);
        let note = created > 0 ? `예약 슬롯 ${created}개 자동 생성 완료` : "";
        if (keptStale > 0) note += ` · 이전 설정의 슬롯 ${keptStale}개는 예약이 있어 유지됨`;
        setSlotProgress(note);
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length < 3 ? [...prev, c] : prev));

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagInput("");
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white border border-border rounded-sm p-10 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4" />
        <h1 className="text-lg font-semibold mb-2">승인 요청이 접수되었습니다</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          플랫폼 운영팀이 24시간 내에 등록 내용을 검수합니다.<br />
          심사 결과는 「팝업 조회/수정」에서 확인할 수 있으며, 승인 즉시 소비자 서비스에 게시됩니다.
        </p>
        {slotProgress && (
          <p className="text-xs text-emerald-600 mb-6 -mt-3">{slotProgress} — 「예약 슬롯·명단」에서 확인하세요.</p>
        )}
        <button onClick={() => navigate("/seller/popups")} className="text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90">
          게시 상태 확인하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-5 items-start">
      {/* 좌측 섹션 내비게이션 */}
      <nav className="hidden xl:flex flex-col w-44 shrink-0 sticky top-20 bg-white border border-border rounded-sm py-2">
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <a key={id} href={`#${id}`} className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-accent hover:bg-accent/5">
            <Icon size={13} /> {label}
          </a>
        ))}
      </nav>

      {/* 본문 폼 */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold">{editId ? "팝업 수정" : "팝업 등록"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            모든 항목을 입력한 뒤 승인 요청하면 운영팀 검수 후 게시됩니다. <Req /> 표시는 필수 항목입니다.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>
        )}

        {/* 1. 기본 정보 */}
        <Section id="basic" title="기본 정보" desc="소비자 검색·탐색에 노출되는 핵심 정보입니다.">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>팝업명 <Req /></label>
              <input
                className={inputCls}
                placeholder="예: 무너의 여름방학 팝업"
                maxLength={40}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">브랜드명 + 콘셉트 키워드 조합 권장 · 최대 40자</p>
            </div>
            <div>
              <label className={labelCls}>브랜드명 <Req /></label>
              <input className={inputCls} placeholder="예: 무너프렌즈" />
            </div>
          </div>
          <div>
            <label className={labelCls}>카테고리 <Req /> <span className="font-normal text-muted-foreground">(최대 3개)</span></label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    cats.includes(c) ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:border-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>해시태그 <span className="font-normal text-muted-foreground">(최대 10개, 검색 노출에 반영)</span></label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="#태그 입력 후 Enter"
              />
              <button type="button" onClick={addTag} className="shrink-0 px-3 border border-border rounded-sm text-muted-foreground hover:border-accent hover:text-accent">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-sm">
                  #{t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))}><X size={11} className="text-muted-foreground hover:text-foreground" /></button>
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* 2. 운영 기간·시간 */}
        <Section id="schedule" title="운영 기간·시간" desc="최소 1일, 최대 90일까지 등록 가능합니다.">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>시작일 <Req /></label>
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>종료일 <Req /></label>
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>운영 시간 <Req /></label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={sameHours} onChange={(e) => setSameHours(e.target.checked)} className="accent-[#E85D3C]" />
                모든 요일 동일
              </label>
            </div>
            {sameHours ? (
              <div className="flex items-center gap-2 text-[13px]">
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputCls + " w-32"} />
                <span className="text-muted-foreground">—</span>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputCls + " w-32"} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {DAYS.map((d) => (
                  <div key={d} className="flex items-center gap-2 text-[13px]">
                    <span className="w-6 text-xs text-muted-foreground">{d}</span>
                    <input type="time" defaultValue={d === "토" || d === "일" ? "10:00" : "11:00"} className={inputCls + " w-32"} />
                    <span className="text-muted-foreground">—</span>
                    <input type="time" defaultValue={d === "토" || d === "일" ? "21:00" : "20:00"} className={inputCls + " w-32"} />
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
                      <input type="checkbox" className="accent-[#E85D3C]" /> 휴무
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* 3. 위치·공간 — 파트너 공간 선택 기능은 7/25 피드백으로 삭제, 직접 주소 입력만 */}
        <Section id="location" title="위치·공간" desc="주소는 위경도 좌표로 변환되어 지도에 노출됩니다.">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className={labelCls}>주소 <Req /></label>
              <input className={inputCls} placeholder="도로명 주소 입력" value={directAddress} onChange={(e) => setDirectAddress(e.target.value)} />
            </div>
            <button type="button" className="text-xs px-4 py-2 border border-border rounded-sm hover:border-accent hover:text-accent">주소 검색</button>
            <div className="sm:col-span-2 h-36 bg-secondary rounded-sm flex items-center justify-center text-xs text-muted-foreground">
              <MapPin size={14} className="mr-1.5" /> 주소 입력 시 지도 미리보기 (위경도 자동 변환)
            </div>
          </div>
        </Section>

        {/* 4. 이미지·미디어 */}
        <Section id="media" title="이미지·미디어" desc={`대표 이미지 1200×900px 이상 · JPG만 가능 · 장당 최대 ${MAX_IMAGE_MB}MB · 추가 이미지 최대 20장`}>
          <div>
            <label className={labelCls}>대표 이미지 (썸네일) <Req /></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                const { ok, rejected } = filterJpegs(Array.from(e.target.files ?? []));
                if (rejected.length) alert(`업로드할 수 없는 파일:\n${rejected.join("\n")}`);
                if (ok.length) setImages((prev) => [...prev, ...ok].slice(0, 20));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors"
            >
              <Upload size={18} /> 클릭하여 업로드 (등록 완료 시 서버로 전송됩니다)
            </button>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {images.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-sm">
                    <ImageIcon size={11} /> {f.name}
                    <button onClick={() => setImages(images.filter((_, j) => j !== i))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>홍보 영상 URL <span className="font-normal text-muted-foreground">(선택)</span></label>
            <input className={inputCls} placeholder="https://youtube.com/…" />
          </div>
        </Section>

        {/* 5. 예약·입장 정책 */}
        <Section id="entry" title="예약·입장 정책" desc="여기서 정한 운영 방식이 대기열·인원 관제 화면에 그대로 적용됩니다.">
          <div>
            <label className={labelCls}>운영 방식 <Req /></label>
            <div className="flex gap-2">
              {(["RESERVATION", "WALKIN", "BOTH"] as OpsMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOpsMode(m)}
                  className={`text-xs px-4 py-2 rounded-sm border transition-colors ${
                    opsMode === m ? "border-accent text-accent bg-accent/5 font-medium" : "border-border text-muted-foreground hover:border-accent"
                  }`}
                >
                  {OPS_MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              사전예약과 현장 웨이팅을 동시에 운영할 때의 현장 대기열 조정 권한은 주최자에게 있습니다.
            </p>
          </div>
          {/* 운영 방식과 무관하게 필수 — 현장 웨이팅(FREE)·라이브 혼잡도 계산이 popup.capacity를 사용 */}
          <div className="sm:w-1/2 sm:pr-2">
            <label className={labelCls}>최대 수용 정원 (동시 수용 인원) <Req /></label>
            <input
              type="number" min={1} value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          {useReservation && (
            <div className="p-4 bg-secondary/60 rounded-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>슬롯 단위 (체험 소요시간)</label>
                  <select value={slotUnit} onChange={(e) => setSlotUnit(Number(e.target.value))} className={inputCls}>
                    <option value={30}>30분</option>
                    <option value={60}>60분</option>
                    <option value={90}>90분</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>슬롯당 예약 정원</label>
                  <input
                    type="number" min={1} value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
                <Info size={11} /> 등록 시 운영기간 × 운영시간을 슬롯 단위로 나눠 예약 슬롯이 자동 생성됩니다.
                예) 11:00~19:00 · 30분 단위 → 날짜별 11:00~11:30 … 18:30~19:00
              </p>
            </div>
          )}
          {/* 입장료·혼잡도 설정은 7/24 피드백으로 제거. 최대 수용 정원은 서버 필수(capacity/areaSqm 중 하나)라 7/27 복원 */}
        </Section>

        {/* 6. 상세 설명 */}
        <Section id="detail" title="상세 설명" desc="최대 2,000자 · 마크다운 지원 (굵게, 목록, 소제목)">
          <textarea
              rows={8}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls + " resize-y leading-relaxed"}
              placeholder={"팝업의 콘셉트, 판매 상품, 포토존·이벤트 등을 소개해 주세요.\n\n## 이런 걸 만나요\n- 한정판 굿즈 20종\n- 브랜드 캐릭터 포토존"}
          />
          <div>
            <label className={labelCls}>상세 설명 이미지 <span className="font-normal text-muted-foreground">(세로형 JPG 1장 — 상품 상세페이지처럼 본문 아래 노출)</span></label>
            <input
              ref={detailInputRef}
              type="file"
              accept="image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const { ok, rejected } = filterJpegs([f]);
                  if (rejected.length) alert(`업로드할 수 없는 파일:\n${rejected.join("\n")}`);
                  if (ok[0]) setDetailImage(ok[0]);
                }
                e.target.value = "";
              }}
            />
            {detailImage ? (
              <div className="flex items-center gap-2 text-xs bg-secondary px-3 py-2.5 rounded-sm">
                <ImageIcon size={13} /> {detailImage.name}
                <span className="text-muted-foreground">({(detailImage.size / 1024 / 1024).toFixed(1)}MB)</span>
                <button type="button" onClick={() => setDetailImage(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => detailInputRef.current?.click()}
                className="w-full h-20 border-2 border-dashed border-border rounded-sm flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload size={15} /> 상세 이미지 JPG 업로드 (1장)
              </button>
            )}
          </div>
        </Section>

        {/* 하단 액션 바 */}
        <div className="sticky bottom-0 bg-white border border-border rounded-sm px-5 py-3 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-muted-foreground hidden sm:block">임시저장 시 「팝업 조회/수정」에서 이어서 작성할 수 있습니다.</p>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => navigate("/seller/popups")} className="text-xs px-4 py-2.5 border border-border rounded-sm hover:bg-secondary">
              임시저장
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="text-xs px-6 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 font-medium disabled:opacity-50"
            >
              {submitting ? "전송 중…" : editId ? "수정 저장" : "승인 요청 (게시 신청)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
