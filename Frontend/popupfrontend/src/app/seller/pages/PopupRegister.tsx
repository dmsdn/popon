import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  FileText, MapPin, Image as ImageIcon, AlignLeft, CalendarClock,
  Ticket, Upload, Plus, X, Info, CheckCircle2,
} from "lucide-react";
import { createPopup, updatePopup, getPopup, uploadPopupImage, getVenues } from "../../lib/api";
import { ensureSlots } from "../../lib/slotAutoGen";

const CATEGORIES = ["패션", "뷰티", "F&B", "캐릭터", "라이프스타일", "아트", "테크", "엔터테인먼트"];
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
// 파트너 공간: 관리자 공간 마스터(/api/venues, 대관 가능만) 실데이터 — 표기: "이름 (면적㎡)"
const venueLabel = (name: string, areaSqm: number | null) => (areaSqm != null ? `${name} (${areaSqm}㎡)` : name);

const SECTIONS = [
  { id: "basic", icon: FileText, label: "기본 정보" },
  { id: "schedule", icon: CalendarClock, label: "운영 기간·시간" },
  { id: "location", icon: MapPin, label: "위치·공간" },
  { id: "media", icon: ImageIcon, label: "이미지·미디어" },
  { id: "detail", icon: AlignLeft, label: "상세 설명" },
  { id: "entry", icon: Ticket, label: "예약·입장 정책" },
];

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
  const [spaceMode, setSpaceMode] = useState<"partner" | "direct">("partner");
  const [useReservation, setUseReservation] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sameHours, setSameHours] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 백엔드 연동 필드
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-15");
  const [openTime, setOpenTime] = useState("11:00");
  const [closeTime, setCloseTime] = useState("20:00");
  // 예약 정책 (백엔드 필수: reservationMode·avgExperienceMinutes) — 슬롯은 이 값 기준 자동 생성
  const [slotUnit, setSlotUnit] = useState(30); // 슬롯 단위(분) = 체험 소요시간
  const [slotCapacity, setSlotCapacity] = useState(10); // 슬롯당 예약 정원 (자동 생성 시 사용)
  const [maxCapacity, setMaxCapacity] = useState(120); // 동시 수용 정원
  const [slotProgress, setSlotProgress] = useState(""); // 자동 생성 진행 안내
  const [partnerSpaces, setPartnerSpaces] = useState<string[]>([]);
  const [partnerSpace, setPartnerSpace] = useState("");
  const [directAddress, setDirectAddress] = useState("");

  // 파트너 공간 목록: 관리자 공간 마스터에서 대관 가능(AVAILABLE)만 로드
  useEffect(() => {
    getVenues("AVAILABLE")
      .then((vs) => {
        const labels = vs.map((v) => venueLabel(v.name, v.areaSqm));
        setPartnerSpaces(labels);
        setPartnerSpace((prev) => prev || labels[0] || "");
      })
      .catch(() => setPartnerSpaces([]));
  }, []);

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
        if (p.reservationMode) setUseReservation(p.reservationMode === "SLOT");
        if (p.avgExperienceMinutes) setSlotUnit(p.avgExperienceMinutes);
        if (p.capacity) setMaxCapacity(p.capacity);
        if (p.location) {
          // 파트너 공간 목록에 있으면 파트너 모드, 아니면 직접 입력으로 간주
          setSpaceMode("direct");
          setDirectAddress(p.location);
          setPartnerSpaces((labels) => {
            if (labels.includes(p.location!)) {
              setSpaceMode("partner");
              setPartnerSpace(p.location!);
              setDirectAddress("");
            }
            return labels;
          });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 정보를 불러오지 못했습니다."));
  }, [editId]);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) return setError("팝업명을 입력해 주세요.");
    if (!description.trim()) return setError("상세 설명을 입력해 주세요.");
    if (!startDate || !endDate) return setError("운영 기간(시작일·종료일)을 입력해 주세요.");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      location: spaceMode === "partner" ? partnerSpace : directAddress.trim(),
      startDate: `${startDate}T${openTime}:00`,
      endDate: `${endDate}T${closeTime}:00`,
      capacity: maxCapacity,
      reservationMode: (useReservation ? "SLOT" : "FREE") as "SLOT" | "FREE",
      avgExperienceMinutes: slotUnit,
    };

    setSubmitting(true);
    try {
      const popup = editId ? await updatePopup(editId, payload) : await createPopup(payload);
      for (const file of images) {
        await uploadPopupImage(popup.id, file);
      }
      // 사전예약제(SLOT)면 운영기간 × 운영시간 × 슬롯 단위로 예약 슬롯 자동 생성 (없는 것만)
      if (useReservation) {
        setSlotProgress("운영시간 기준 예약 슬롯 자동 생성 중…");
        const { created } = await ensureSlots(popup, slotCapacity);
        setSlotProgress(created > 0 ? `예약 슬롯 ${created}개 자동 생성 완료` : "");
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

        {/* 3. 위치·공간 */}
        <Section id="location" title="위치·공간" desc="파트너 공간 선택 시 시설정보·반입규정이 자동 연동됩니다. 주소는 위경도 좌표로 변환되어 지도에 노출됩니다.">
          <div className="flex gap-2">
            {(["partner", "direct"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSpaceMode(m)}
                className={`text-xs px-4 py-2 rounded-sm border transition-colors ${
                  spaceMode === m ? "border-accent text-accent bg-accent/5 font-medium" : "border-border text-muted-foreground"
                }`}
              >
                {m === "partner" ? "팝업온 파트너 공간" : "직접 주소 입력"}
              </button>
            ))}
          </div>
          {spaceMode === "partner" ? (
            <div>
              <label className={labelCls}>대관 공간 선택 <Req /></label>
              <select className={inputCls} value={partnerSpace} onChange={(e) => setPartnerSpace(e.target.value)}>
                {partnerSpaces.length === 0 && <option value="">등록된 파트너 공간이 없습니다</option>}
                {partnerSpaces.map((s) => <option key={s}>{s}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Info size={11} /> 관리자 공간 마스터의 대관 가능 공간이 표시됩니다. 대관 일정은 「견적·진행 단계」에서 확인 후 신청하세요.
              </p>
            </div>
          ) : (
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
          )}
        </Section>

        {/* 4. 이미지·미디어 */}
        <Section id="media" title="이미지·미디어" desc="대표 이미지 1200×900px 이상 · JPG/PNG/WEBP · 장당 최대 10MB · 추가 이미지 최대 20장">
          <div>
            <label className={labelCls}>대표 이미지 (썸네일) <Req /></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setImages((prev) => [...prev, ...files].slice(0, 20));
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

        {/* 5. 상세 설명 */}
        <Section id="detail" title="상세 설명" desc="최대 2,000자 · 마크다운 지원 (굵게, 목록, 소제목)">
          <textarea
            rows={8}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls + " resize-y leading-relaxed"}
            placeholder={"팝업의 콘셉트, 판매 상품, 포토존·이벤트 등을 소개해 주세요.\n\n## 이런 걸 만나요\n- 한정판 굿즈 20종\n- 브랜드 캐릭터 포토존"}
          />
        </Section>

        {/* 6. 예약·입장 정책 */}
        <Section id="entry" title="예약·입장 정책" desc="사전예약제 운영 시 팝업온 예약·QR 입장 시스템과 자동 연동됩니다.">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="radio" name="resv" checked={useReservation} onChange={() => setUseReservation(true)} className="accent-[#E85D3C]" />
              사전예약제 운영
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="radio" name="resv" checked={!useReservation} onChange={() => setUseReservation(false)} className="accent-[#E85D3C]" />
              현장 입장만 운영
            </label>
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
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>입장료</label>
              <div className="relative">
                <input type="number" defaultValue={0} className={inputCls + " pr-8"} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>최대 수용 정원 <Req /></label>
              <input
                type="number" min={1} value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>혼잡 알림 임계치</label>
              <select className={inputCls}>
                <option>정원의 80% (혼잡)</option>
                <option>정원의 70%</option>
                <option>정원의 90%</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info size={11} /> 혼잡도 기준: 정원 대비 80% 이상 "혼잡" · 50~80% "보통" · 이하 "여유"
          </p>
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
