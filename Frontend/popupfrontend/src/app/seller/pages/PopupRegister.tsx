import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  FileText, MapPin, Image as ImageIcon, AlignLeft, CalendarClock,
  Ticket, Upload, Plus, X, Info, CheckCircle2, Search, Loader2, AlertTriangle,
} from "lucide-react";
import { createPopup, updatePopup, getPopup, uploadPopupImage, getKeywords, getRegions, IdName, SnsLinkInput, SnsPlatformCode } from "../../lib/api";
import { ensureSlots } from "../../lib/slotAutoGen";
import { loadOpsMode, saveOpsMode, OpsMode } from "../../lib/walkinQueue";
import {
  loadPostcode, loadNaverMaps, geocodeAddress, searchAddressByNaver,
  DaumPostcodeResult, NaverMap, AddressCandidate,
} from "../../lib/externalScripts";

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

// 카테고리는 7/29부터 하드코딩 대신 keyword 테이블(GET /api/keywords) 실데이터 — 컴포넌트에서 로드
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// SNS 플랫폼 선택지 (백엔드 SnsPlatform enum과 1:1)
const SNS_PLATFORMS: { code: SnsPlatformCode; label: string }[] = [
  { code: "INSTAGRAM", label: "인스타그램" },
  { code: "YOUTUBE", label: "유튜브" },
  { code: "X", label: "X(트위터)" },
  { code: "FACEBOOK", label: "페이스북" },
  { code: "TIKTOK", label: "틱톡" },
  { code: "BLOG", label: "블로그" },
  { code: "HOMEPAGE", label: "홈페이지" },
  { code: "ETC", label: "기타" },
];

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

// 서버가 실제로 변환하는 규격 — 백엔드 PopupService.uploadImage의 resizeToJpeg 인자와 동일하게 유지할 것.
// 프론트는 리사이즈하지 않고 원본을 그대로 올리므로, 이 값들은 "안내 문구 전용"이다.
// 임의로 바꾸면 화면 안내와 실제 결과물이 어긋난다 (7/29 — 인스타 규격·가로780 같은 임의 표기를 실제 값으로 교체).
const THUMB_SPEC = "800×800";   // THUMBNAIL — 목록·카드용 정사각
const DETAIL_SPEC = "1080×1440"; // DETAIL — 상세 본문용 세로형(3:4)
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
  // 카테고리·지역 마스터 (7/29 — keyword·region 테이블 실데이터. 선택은 id로 관리해 서버에 그대로 전송)
  const [keywords, setKeywords] = useState<IdName[]>([]);
  const [regions, setRegions] = useState<IdName[]>([]);
  const [cats, setCats] = useState<number[]>([]); // 선택된 keyword id (최대 3개)
  const [regionId, setRegionId] = useState<number | "">(""); // 선택된 region id ("" = 미선택)
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  // 운영 방식(사전예약만/현장 웨이팅만/둘 다) — 대기열·인원 관제와 공유 (localStorage, 백엔드 구성 후 연동)
  const [opsMode, setOpsMode] = useState<OpsMode>("BOTH");
  const useReservation = opsMode !== "WALKIN"; // 사전예약 포함 여부 → 슬롯 자동 생성 대상
  const [images, setImages] = useState<File[]>([]);
  // 상세 설명용 세로형 JPG — 7/29부터 여러 장 (쿠팡 상품 상세처럼 본문 아래 세로로 이어붙음)
  const [detailImages, setDetailImages] = useState<File[]>([]);
  // SNS 링크 (7/29 — 홍보영상 칸 대체, 백엔드 snsLinks 실저장)
  const [snsLinks, setSnsLinks] = useState<SnsLinkInput[]>([]);
  const [snsPlatform, setSnsPlatform] = useState<SnsPlatformCode>("INSTAGRAM");
  const [snsUrl, setSnsUrl] = useState("");
  const addSnsLink = () => {
    const url = snsUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) return alert("SNS URL은 http:// 또는 https://로 시작해야 합니다.");
    if (snsLinks.length >= 8) return alert("SNS 링크는 최대 8개까지 등록할 수 있습니다.");
    setSnsLinks((prev) => [...prev, { platform: snsPlatform, url }]);
    setSnsUrl("");
  };
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

  // ── 주소 검색(다음 우편번호) + 지도 미리보기(네이버 Dynamic Map) ──
  const [zonecode, setZonecode] = useState("");           // 우편번호 (표시용, 서버 미전송)
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const mapBoxRef = useRef<HTMLDivElement>(null);         // 지도가 그려질 DOM
  const mapRef = useRef<NaverMap | null>(null);           // 지도 인스턴스(재사용 — 매번 새로 만들지 않음)
  const markerRef = useRef<unknown>(null);
  // 다음 우편번호가 막힌 환경용 대체 검색 (네이버 지오코딩 기반)
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackQuery, setFallbackQuery] = useState("");
  const [fallbackList, setFallbackList] = useState<AddressCandidate[]>([]);
  const [fallbackBusy, setFallbackBusy] = useState(false);

  // 카테고리·지역 마스터 로드 (1회) — 실패해도 폼의 나머지는 동작해야 하므로 조용히 빈 목록 유지
  useEffect(() => {
    getKeywords().then(setKeywords).catch(() => {});
    getRegions().then(setRegions).catch(() => {});
  }, []);

  // 수정 모드에서 서버가 준 카테고리 "이름"을 마스터 로드 후 id로 되돌리기 위한 대기값
  const [pendingCatNames, setPendingCatNames] = useState<string[] | null>(null);
  useEffect(() => {
    if (!pendingCatNames || keywords.length === 0) return;
    setCats(keywords.filter((k) => pendingCatNames.includes(k.name)).map((k) => k.id).slice(0, 3));
    setPendingCatNames(null);
  }, [pendingCatNames, keywords]);

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
        if (p.keywordNames?.length) setPendingCatNames(p.keywordNames); // 7/29 카테고리 복원 (이름→id는 마스터 로드 후)
        if (p.snsLinks?.length) setSnsLinks(p.snsLinks.map((l) => ({ platform: l.platform as SnsPlatformCode, url: l.url }))); // 7/29 SNS 복원
        if (p.location) previewOnMap(p.location);    // 수정 모드도 지도에 기존 위치 표시
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 정보를 불러오지 못했습니다."));
  }, [editId]);

  // 주소가 정해지면 좌표를 구해 지도에 핀을 찍는다.
  // 서버도 등록 시 같은 주소를 지오코딩하므로, 여기 좌표는 "등록 전 확인용" 미리보기다.
  const previewOnMap = async (address: string) => {
    if (!address.trim()) return;
    setMapError("");
    setGeocoding(true);
    try {
      await loadNaverMaps();
      const found = await geocodeAddress(address);
      if (!found) {
        setCoord(null);
        setMapError("이 주소로는 좌표를 찾지 못했습니다. 도로명 주소로 다시 입력해 주세요.");
        return;
      }
      setCoord(found);

      const naver = window.naver!;
      const center = new naver.maps.LatLng(found.lat, found.lng);
      if (!mapRef.current && mapBoxRef.current) {
        // 최초 1회만 지도 생성 — 이후에는 중심만 옮긴다
        mapRef.current = new naver.maps.Map(mapBoxRef.current, { center, zoom: 16 });
        markerRef.current = new naver.maps.Marker({ position: center, map: mapRef.current });
      } else if (mapRef.current) {
        mapRef.current.setCenter(center);
        (markerRef.current as { setPosition: (p: unknown) => void } | null)?.setPosition(center);
      }
    } catch (e) {
      setCoord(null);
      setMapError(e instanceof Error ? e.message : "지도를 불러오지 못했습니다.");
    } finally {
      setGeocoding(false);
    }
  };

  // 「주소 검색」 — 다음 우편번호 팝업을 띄우고, 고른 도로명 주소를 입력칸에 채운다.
  // 사내망 등에서 daum.net이 막히면 네이버 지오코딩 기반 대체 검색으로 자동 전환한다.
  const openAddressSearch = async () => {
    setMapError("");
    try {
      await loadPostcode();
    } catch {
      // 다음 우편번호가 막힌 환경 — 네이버 지오코딩 기반 검색으로 조용히 전환한다.
      // 우편번호까지 같이 나오므로 사용자가 잃는 정보는 없다(경고 대신 안내만).
      setFallbackOpen(true);
      setFallbackQuery(directAddress);
      return;
    }
    new window.daum!.Postcode({
      oncomplete: (data: DaumPostcodeResult) => {
        // 도로명이 없는 지역은 지번 주소로 대체
        const base = data.roadAddress || data.jibunAddress;
        const full = data.buildingName ? `${base} (${data.buildingName})` : base;
        setDirectAddress(full);
        setZonecode(data.zonecode);
        previewOnMap(base); // 좌표 검색은 건물명 없는 순수 주소로
      },
    }).open();
  };

  // 대체 검색 실행 — 네이버 지오코딩이 돌려준 후보 목록을 보여준다
  const runFallbackSearch = async () => {
    if (!fallbackQuery.trim()) return;
    setFallbackBusy(true);
    setMapError("");
    try {
      const list = await searchAddressByNaver(fallbackQuery.trim());
      setFallbackList(list);
      if (list.length === 0) setMapError("검색 결과가 없습니다. 도로명 주소를 더 정확히 입력해 주세요.");
    } catch (e) {
      setMapError(e instanceof Error ? e.message : "주소 검색에 실패했습니다.");
    } finally {
      setFallbackBusy(false);
    }
  };

  // 후보 선택 — 주소·좌표를 한 번에 확정 (지오코딩 재호출 불필요)
  const pickFallback = (c: AddressCandidate) => {
    const addr = c.roadAddress || c.jibunAddress;
    setDirectAddress(addr);
    setZonecode(c.postalCode);
    setCoord({ lat: c.lat, lng: c.lng });
    setFallbackOpen(false);
    setFallbackList([]);
    setMapError("");
    const naver = window.naver;
    if (!naver) return;
    const center = new naver.maps.LatLng(c.lat, c.lng);
    if (!mapRef.current && mapBoxRef.current) {
      mapRef.current = new naver.maps.Map(mapBoxRef.current, { center, zoom: 16 });
      markerRef.current = new naver.maps.Marker({ position: center, map: mapRef.current });
    } else if (mapRef.current) {
      mapRef.current.setCenter(center);
      (markerRef.current as { setPosition: (p: unknown) => void } | null)?.setPosition(center);
    }
  };

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
      // 7/29 — 표준 카테고리·지역을 서버에 실저장 (소비자 카테고리·관심지역 필터 매칭)
      keywordIds: cats,
      addressKeywordId: regionId === "" ? undefined : regionId,
      snsLinks: snsLinks.map((l, i) => ({ ...l, sortOrder: i })),
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
      // 7/29 — 서버가 type별로 규격 리사이즈 (THUMB_SPEC / DETAIL_SPEC). 순서 보존 위해 순차 업로드
      for (const file of images) {
        await uploadPopupImage(popup.id, file, "THUMBNAIL");
      }
      for (const file of detailImages) {
        await uploadPopupImage(popup.id, file, "DETAIL");
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

  const toggleCat = (id: number) =>
    setCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));

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
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <label className={labelCls}>카테고리 <Req /> <span className="font-normal text-muted-foreground">(최대 3개)</span></label>
              <div className="flex flex-wrap gap-2">
                {keywords.length === 0 && (
                  <span className="text-[11px] text-muted-foreground py-1.5">카테고리 목록을 불러오는 중…</span>
                )}
                {keywords.map((k) => {
                  const selected = cats.includes(k.id);
                  const full = !selected && cats.length >= 3;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => toggleCat(k.id)}
                      disabled={full}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-accent text-white border-accent"
                          : full
                            ? "border-border text-muted-foreground/40 cursor-not-allowed"
                            : "border-border text-muted-foreground hover:border-accent"
                      }`}
                    >
                      {k.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:w-44">
              <label className={labelCls}>지역 <span className="font-normal text-muted-foreground">(소비자 지역 필터)</span></label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              >
                <option value="">선택 안 함</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
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
              <input
                className={inputCls}
                placeholder="주소 검색 버튼을 눌러 선택하세요"
                value={directAddress}
                onChange={(e) => setDirectAddress(e.target.value)}
                // 직접 입력한 경우에도 포커스가 빠지면 지도에 반영
                onBlur={(e) => e.target.value.trim() && previewOnMap(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={openAddressSearch}
              className="flex items-center gap-1.5 text-xs px-4 py-2 border border-border rounded-sm hover:border-accent hover:text-accent"
            >
              <Search size={13} /> 주소 검색
            </button>

            {/* 대체 검색 — 다음 우편번호를 못 쓸 때만 열린다 */}
            {fallbackOpen && (
              <div className="sm:col-span-2 border border-accent/40 bg-accent/5 rounded-sm p-3 flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground">
                  도로명 주소를 입력하고 검색하면 후보가 나옵니다. 선택하면 우편번호와 좌표가 함께 채워집니다.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls + " flex-1"}
                    placeholder="예: 서울 마포구 양화로 45"
                    value={fallbackQuery}
                    onChange={(e) => setFallbackQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runFallbackSearch())}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={runFallbackSearch}
                    disabled={fallbackBusy}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50 shrink-0"
                  >
                    {fallbackBusy ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} 검색
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFallbackOpen(false); setFallbackList([]); }}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="닫기"
                  >
                    <X size={15} />
                  </button>
                </div>
                {fallbackList.length > 0 && (
                  <ul className="max-h-44 overflow-y-auto divide-y divide-border bg-white border border-border rounded-sm">
                    {fallbackList.map((c, i) => (
                      <li key={`${c.lat},${c.lng},${i}`}>
                        <button
                          type="button"
                          onClick={() => pickFallback(c)}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/60 transition-colors"
                        >
                          <div className="text-[13px] font-medium">{c.roadAddress || c.jibunAddress}</div>
                          {c.roadAddress && c.jibunAddress && (
                            <div className="text-[11px] text-muted-foreground">지번 {c.jibunAddress}</div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 선택 결과 — 주소·우편번호·좌표 */}
            <div className="sm:col-span-2">
              {directAddress ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 bg-secondary/60 border border-border rounded-sm text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin size={13} className="text-accent shrink-0" /> {directAddress}
                  </span>
                  {zonecode && <span className="text-muted-foreground">우편번호 {zonecode}</span>}
                  {geocoding && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 size={11} className="animate-spin" /> 좌표 변환 중…
                    </span>
                  )}
                  {coord && (
                    <span className="text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  주소를 선택하면 아래 지도에 위치가 표시되고, 등록 시 위경도 좌표로 저장됩니다.
                </p>
              )}
              {mapError && (
                <div className="mt-2 flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-800">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {mapError}
                </div>
              )}
            </div>

            {/* 지도 — 좌표를 찾기 전에는 안내 문구, 찾으면 이 자리에 네이버 지도가 그려진다.
                주의: 지도 컨테이너에는 반드시 실제 높이(h-full)를 줘야 한다.
                naver.maps.Map은 생성 시 컨테이너의 position을 relative로 덮어쓰므로,
                absolute+inset-0으로 높이를 잡으면 그 순간 높이가 0이 되어 타일이 보이지 않는다. */}
            <div className="sm:col-span-2 relative h-56 bg-secondary rounded-sm overflow-hidden">
              <div ref={mapBoxRef} className="h-full w-full" />
              {!coord && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                  <MapPin size={14} className="mr-1.5" /> 주소를 선택하면 지도가 표시됩니다
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* 4. 이미지·미디어 */}
        <Section id="media" title="이미지·미디어" desc={`업로드하면 서버가 규격에 맞춰 변환합니다 (썸네일 ${THUMB_SPEC} · 상세 ${DETAIL_SPEC}) · JPG만 가능 · 장당 최대 ${MAX_IMAGE_MB}MB · 최대 20장`}>
          <div>
            <label className={labelCls}>
              대표 이미지 (썸네일) <Req />
              <span className="font-normal text-muted-foreground"> — {THUMB_SPEC} 정사각으로 변환</span>
            </label>
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
            {/* 7/29 — 홍보영상 칸을 SNS 링크 입력으로 대체 (백엔드 snsLinks 실저장, 소비자 상세에 노출) */}
            <label className={labelCls}>SNS·홈페이지 링크 <span className="font-normal text-muted-foreground">(선택 · 최대 8개)</span></label>
            <div className="flex gap-2">
              <select
                value={snsPlatform}
                onChange={(e) => setSnsPlatform(e.target.value as SnsPlatformCode)}
                className={inputCls + " w-36 shrink-0"}
              >
                {SNS_PLATFORMS.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <input
                className={inputCls}
                value={snsUrl}
                onChange={(e) => setSnsUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSnsLink())}
                type="url"
                placeholder="https://instagram.com/brand"
              />
              <button type="button" onClick={addSnsLink} className="shrink-0 px-3 border border-border rounded-sm text-muted-foreground hover:border-accent hover:text-accent">
                <Plus size={14} />
              </button>
            </div>
            {snsLinks.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {snsLinks.map((l, i) => (
                  <div key={`${l.platform}-${l.url}-${i}`} className="flex items-center gap-2 text-xs bg-secondary px-3 py-2 rounded-sm">
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-white shrink-0">
                      {SNS_PLATFORMS.find((p) => p.code === l.platform)?.label ?? l.platform}
                    </span>
                    <span className="truncate">{l.url}</span>
                    <button type="button" onClick={() => setSnsLinks(snsLinks.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          {/* 7/29 정렬 정리: 아래 슬롯 설정과 같은 2열 그리드로 맞춰 행마다 좌우 끝이 일치하게 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>최대 수용 정원 (동시 수용 인원) <Req /></label>
              <input
                type="number" min={1} value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className={inputCls}
              />
            </div>
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
            {/* 7/29 — 여러 장 허용. 업로드 순서 = 본문 아래 노출 순서(서버 sortOrder). 규격은 서버가 DETAIL_SPEC으로 리사이즈 */}
            <label className={labelCls}>상세 설명 이미지 <span className="font-normal text-muted-foreground">(JPG 여러 장 · {DETAIL_SPEC} 세로형으로 변환 — 상품 상세페이지처럼 본문 아래 순서대로 이어붙습니다)</span></label>
            <input
              ref={detailInputRef}
              type="file"
              accept="image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                const { ok, rejected } = filterJpegs(Array.from(e.target.files ?? []));
                if (rejected.length) alert(`업로드할 수 없는 파일:\n${rejected.join("\n")}`);
                if (ok.length) setDetailImages((prev) => [...prev, ...ok].slice(0, 20));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => detailInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-border rounded-sm flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors"
            >
              <Upload size={15} /> 상세 이미지 JPG 업로드 (여러 장 가능)
            </button>
            {detailImages.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {detailImages.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs bg-secondary px-3 py-2 rounded-sm">
                    <span className="w-5 h-5 rounded-sm bg-white border border-border flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                    <ImageIcon size={13} /> <span className="truncate">{f.name}</span>
                    <span className="text-muted-foreground shrink-0">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
                    <button type="button" onClick={() => setDetailImages(detailImages.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
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
