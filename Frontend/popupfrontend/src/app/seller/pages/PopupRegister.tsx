import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  FileText, MapPin, Image as ImageIcon, AlignLeft, CalendarClock,
  Ticket, Upload, Plus, X, Info, CheckCircle2, Search, Loader2, AlertTriangle, RotateCcw,
  ArrowUp, ArrowDown,
} from "lucide-react";
import {
  createPopup, updatePopup, getPopup, uploadPopupImage, getPopupImages, deletePopupImage,
  getKeywords, getRegions, getMyInfo, getSlots,
  IdName, SnsLinkInput, SnsPlatformCode, PopupImageItem, PopupStatusCode,
  DayOfWeekCode, OperatingHoursItem,
} from "../../lib/api";
import { ensureSlots } from "../../lib/slotAutoGen";
import { loadOpsMode, saveOpsMode, OpsMode } from "../../lib/walkinQueue";
// 다음 우편번호(loadPostcode)는 7/30 제거 — 키 없는 외부 위젯이라 환경 따라 로드가 자주 막혔고,
// 팝업 열기→검색→선택 3단계를 요구했다. 네이버 지오코딩 검색을 1차 경로로 승격.
import {
  loadNaverMaps, geocodeAddress, searchAddressByNaver,
  NaverMap, AddressCandidate,
} from "../../lib/externalScripts";
import { PopupDraft, findDraft, upsertDraft, removeDraft } from "../../lib/popupDrafts";

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
// 화면의 월~일 순서를 서버 java.time.DayOfWeek 이름으로 — operatingHours 전송·복원 양쪽에서 사용
const DAY_CODES: DayOfWeekCode[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const defaultDayHours = () =>
  DAYS.map((d) => ({ open: d === "토" || d === "일" ? "10:00" : "11:00", close: d === "토" || d === "일" ? "21:00" : "20:00", closed: false }));

// SNS 플랫폼 선택지 (백엔드 SnsPlatform enum과 1:1)
// 7/30 백엔드 enum 개편 반영 — FACEBOOK·TIKTOK 삭제, NAVERMAP 추가.
// 요청 DTO의 platform이 enum 타입이라, 목록이 어긋난 값을 보내면 역직렬화 단계에서
// 등록·수정 요청 "전체"가 400으로 거부된다 (SNS만 빠지는 게 아니라 팝업 저장 자체가 실패).
const SNS_PLATFORMS: { code: SnsPlatformCode; label: string }[] = [
  { code: "INSTAGRAM", label: "인스타그램" },
  { code: "YOUTUBE", label: "유튜브" },
  { code: "X", label: "X(트위터)" },
  { code: "BLOG", label: "블로그" },
  { code: "HOMEPAGE", label: "홈페이지" },
  { code: "NAVERMAP", label: "네이버 지도" },
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

// 폭 유틸(w-full)을 뺀 본체. 폭을 따로 지정해야 하는 칸은 이걸 쓴다.
// inputCls(=w-full 포함)에 " w-36"을 덧붙이면 둘 다 width 유틸이라 CSS 파일 순서로 승자가 갈리는데,
// 실제로 w-full이 이겨서 SNS 셀렉트가 행을 다 차지하고 옆 URL 칸이 26px로 찌그러졌다 (7/29).
const inputBase =
  "px-3 py-2 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent placeholder:text-muted-foreground/60";
const inputCls = `w-full ${inputBase}`;
const labelCls = "block text-xs font-medium mb-1.5";
const Req = () => <span className="text-red-500 ml-0.5">*</span>;

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-card border border-border rounded-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="p-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

// 서버에 이미 올라가 있는 이미지 한 장 (수정 모드 전용).
// X를 눌러도 그 자리에서 서버 요청을 보내지 않는다 — 표시만 바꿔두고 「수정 저장」을 눌러야 실제로 지운다.
// 그래야 실수로 눌렀을 때 되돌릴 수 있고, 저장을 취소하면 아무 일도 일어나지 않는다.
function ExistingImage({ img, removed, onRemove, onUndo }: {
  img: PopupImageItem; removed: boolean; onRemove: () => void; onUndo: () => void;
}) {
  return (
    <div className={`relative w-20 h-20 rounded-sm overflow-hidden border ${removed ? "border-red-300" : "border-border"}`}>
      <img src={img.imageUrl} alt="" className={`w-full h-full object-cover ${removed ? "opacity-30" : ""}`} />
      {removed && (
        <span className="absolute inset-x-0 bottom-0 bg-red-500/90 text-white text-[9px] text-center py-0.5">삭제 예정</span>
      )}
      <button
        type="button"
        onClick={removed ? onUndo : onRemove}
        title={removed ? "삭제 취소" : "이 이미지 제거"}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white/90 border border-border flex items-center justify-center hover:bg-card"
      >
        {removed ? <RotateCcw size={10} /> : <X size={11} />}
      </button>
    </div>
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
  // 수정 모드에서 서버에 이미 올라가 있는 이미지 (7/29 신설).
  // images/detailImages는 File[]이라 "새로 고른 파일"만 담을 수 있어서 서버 이미지는 따로 들고 있어야 한다.
  // 이게 없던 동안은 수정 화면에 기존 이미지가 아예 안 보였고, 새로 올리면 교체가 아니라 위에 쌓였다.
  // 수정 대상 팝업의 현재 심사 상태 (7/29).
  // 반려(REJECTED)·게시중지(SUSPENDED)된 팝업은 "수정 저장"이 아니라 "재등록"으로 동작해야 한다 —
  // 내용만 고치고 상태를 그대로 두면 관리자 심사 목록에 다시 올라오지 않아 영영 그 상태로 남는다.
  // (7/29 결정: 관리자 직접 수정 기능은 탈락 — 관리자는 게시중지만 하고, 고치는 건 주최자가 여기서 한다)
  const [editStatus, setEditStatus] = useState<PopupStatusCode | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const isSuspendedEdit = editStatus === "SUSPENDED";
  const isRejected = editStatus === "REJECTED" || isSuspendedEdit; // 재등록 흐름 공용 플래그
  const [serverImages, setServerImages] = useState<PopupImageItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const markImageRemoved = (id: number) => setRemovedImageIds((prev) => [...prev, id]);
  const undoImageRemoved = (id: number) => setRemovedImageIds((prev) => prev.filter((x) => x !== id));
  const serverThumbs = serverImages.filter((i) => i.type === "THUMBNAIL");
  const serverDetails = serverImages.filter((i) => i.type === "DETAIL");
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

  // ── 드래그 앤 드롭 업로드 (7/29) ──────────────────────────
  // 파일 선택 창을 여는 것과 결과가 완전히 같아야 하므로, 검증(filterJpegs)·최대 장수 제한을
  // input onChange와 한 함수로 묶는다. 한쪽만 고쳐서 규칙이 갈리는 걸 막기 위함.
  const [dragOver, setDragOver] = useState<"thumb" | "detail" | null>(null);

  const acceptFiles = (files: File[], target: "thumb" | "detail") => {
    const { ok, rejected } = filterJpegs(files);
    if (rejected.length) alert(`업로드할 수 없는 파일:\n${rejected.join("\n")}`);
    if (!ok.length) return;
    const setter = target === "thumb" ? setImages : setDetailImages;
    setter((prev) => [...prev, ...ok].slice(0, 20));
  };

  const onDrop = (e: React.DragEvent, target: "thumb" | "detail") => {
    e.preventDefault();          // 이게 없으면 브라우저가 파일을 새 탭으로 열어버린다
    setDragOver(null);
    acceptFiles(Array.from(e.dataTransfer.files), target);
  };

  // 새로 고른 파일의 순서 바꾸기 (7/30) — 업로드 순서가 곧 서버 sortOrder = 소비자 노출 순서라서
  // 전송 전에 조정할 수 있어야 한다. (서버에 이미 올라간 이미지는 재정렬 API가 없어 X로 빼고 다시 올린다)
  const moveFile = (target: "thumb" | "detail", i: number, dir: -1 | 1) => {
    const setter = target === "thumb" ? setImages : setDetailImages;
    setter((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  // dragOver에서도 preventDefault가 필요하다 — 안 하면 drop 이벤트 자체가 발생하지 않는다.
  const onDragOver = (e: React.DragEvent, target: "thumb" | "detail") => {
    e.preventDefault();
    if (dragOver !== target) setDragOver(target);
  };

  // 자식 요소를 지날 때마다 leave가 튀어서 테두리가 깜빡이므로, 영역 밖으로 나갔을 때만 끈다
  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
  };

  const dropZoneCls = (target: "thumb" | "detail") =>
    dragOver === target
      ? "border-accent bg-accent/5 text-accent"
      : "border-border text-muted-foreground hover:border-accent hover:text-accent";
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
  // 요일별 운영시간 (7/30 jsw operatingHours API 연동) — 「모든 요일 동일」을 끄면 요일마다 이 값이 적용된다.
  // 그 전에는 요일별 입력칸이 상태와 연결되지 않은 장식이어서 뭘 적어도 저장되지 않았다.
  const [dayHours, setDayHours] = useState(defaultDayHours);
  const setDayHour = (i: number, patch: Partial<{ open: string; close: string; closed: boolean }>) =>
    setDayHours((prev) => prev.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  // 유의사항 — 백엔드 notice 컬럼 (소비자 상세페이지 안내 노출)
  const [notice, setNotice] = useState("");
  // 현장 웨이팅 팀당 최대 인원 — 백엔드 maxPartySizePerTeam ("" = 제한 없음, 미전송)
  const [maxPartyPerTeam, setMaxPartyPerTeam] = useState<number | "">("");
  // 예약 정책 (백엔드 필수: reservationMode·avgExperienceMinutes) — 슬롯은 이 값 기준 자동 생성
  const [slotUnit, setSlotUnit] = useState(30); // 슬롯 단위(분) = 체험 소요시간
  const [slotCapacity, setSlotCapacity] = useState(10); // 슬롯당 예약 정원 (자동 생성 시 사용)
  // 브랜드명은 팝업이 아니라 계정(business.companyName)에 딸린 값이라 폼에서 편집하지 않는다.
  // 표시만 하고 변경은 마이페이지에서 하도록 안내한다 (7/29 — 그 전에는 value조차 없는 빈 칸이었다).
  const [companyName, setCompanyName] = useState("");
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
    // 신규 등록에서는 로그인한 사업자의 상호를 브랜드명 칸에 채운다.
    // (수정 모드는 팝업 응답의 companyName으로 덮어쓴다 — 아래 로더 참고)
    getMyInfo().then((i) => setCompanyName(i.companyName)).catch(() => {});
  }, []);

  // 수정 모드에서 서버가 준 카테고리 "이름"을 마스터 로드 후 id로 되돌리기 위한 대기값
  const [pendingCatNames, setPendingCatNames] = useState<string[] | null>(null);
  useEffect(() => {
    if (!pendingCatNames || keywords.length === 0) return;
    setCats(keywords.filter((k) => pendingCatNames.includes(k.name)).map((k) => k.id).slice(0, 3));
    setPendingCatNames(null);
  }, [pendingCatNames, keywords]);

  // 지역도 같은 문제 (7/29) — PopupResponse는 regionName(이름)만 주고 regionId를 안 준다.
  // 셀렉트는 id로 동작하므로 마스터가 로드된 뒤 이름으로 역매핑해야 한다.
  const [pendingRegionName, setPendingRegionName] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingRegionName || regions.length === 0) return;
    const hit = regions.find((r) => r.name === pendingRegionName);
    if (hit) setRegionId(hit.id);
    setPendingRegionName(null);
  }, [pendingRegionName, regions]);

  // 수정 모드: 기존 팝업 불러와서 폼 채우기
  useEffect(() => {
    if (!editId) return;
    getPopup(editId)
      .then((p) => {
        setEditStatus(p.status);
        // 사유 위치가 다르다: 반려는 rejectReason, 게시중지는 adminEditNote (백엔드 reject/suspend 참고)
        if (p.status === "REJECTED") setRejectReason(p.rejectReason ?? p.adminEditNote ?? null);
        if (p.status === "SUSPENDED") setRejectReason(p.adminEditNote ?? p.rejectReason ?? null);
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
        if (p.regionName) setPendingRegionName(p.regionName);           // 7/29 지역 복원 (동일하게 이름→id)
        if (p.companyName) setCompanyName(p.companyName);               // 7/29 브랜드명 표시용
        // 7/30 SNS 복원 — 구 enum(FACEBOOK·TIKTOK)으로 저장된 링크가 남아 있어도
        // 셀렉트가 죽지 않도록 모르는 코드는 「기타」로 승계한다. url은 그대로 유지.
        if (p.snsLinks?.length) setSnsLinks(p.snsLinks.map((l) => ({
          platform: SNS_PLATFORMS.some((sp) => sp.code === l.platform) ? (l.platform as SnsPlatformCode) : "ETC",
          url: l.url,
        })));
        // 7/30 요일별 운영시간 복원 — 전 요일이 같은 시간이면 「모든 요일 동일」로 접어서 보여준다
        if (p.operatingHours?.length) {
          const byCode = new Map(p.operatingHours.map((h) => [h.dayOfWeek, h]));
          const restored = DAY_CODES.map((code, i) => {
            const h = byCode.get(code);
            if (!h) return defaultDayHours()[i];
            return {
              open: (h.openTime ?? "11:00").slice(0, 5),
              close: (h.closeTime ?? "20:00").slice(0, 5),
              closed: h.closed,
            };
          });
          setDayHours(restored);
          const open7 = restored.filter((h) => !h.closed);
          const uniform = open7.length === 7 && open7.every((h) => h.open === open7[0].open && h.close === open7[0].close);
          setSameHours(uniform);
          if (uniform) { setOpenTime(open7[0].open); setCloseTime(open7[0].close); }
        }
        if (p.maxPartySizePerTeam != null) setMaxPartyPerTeam(p.maxPartySizePerTeam); // 7/30
        if (p.notice) setNotice(p.notice);                                            // 7/30 유의사항 복원
        if (p.location) previewOnMap(p.location);    // 수정 모드도 지도에 기존 위치 표시
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 정보를 불러오지 못했습니다."));
    // 기존 이미지 — 본문 로드와 독립이라 따로 받는다. 실패해도 폼은 쓸 수 있어야 하므로 조용히 넘어간다.
    getPopupImages(editId).then(setServerImages).catch(() => {});
    // 슬롯당 예약 정원은 popup이 아니라 popup_slot에 있는 값이라 팝업 응답만으로는 알 수 없다 (7/29).
    // 이미 생성된 슬롯 중 첫 장의 capacity를 그대로 되살린다 — 슬롯은 전부 같은 정원으로 만들어지므로 대표값이 된다.
    getSlots(editId)
      .then((slots) => { if (slots.length) setSlotCapacity(slots[0].capacity); })
      .catch(() => {});
  }, [editId]);

  // ── 임시저장 (7/30) — 진짜로 저장한다 ─────────────────────────────
  // 그 전의 「임시저장」 버튼은 목록으로 이동만 하고 아무것도 저장하지 않는 장식이었다.
  // 백엔드에 "작성 중" 상태가 없으므로(등록 즉시 PENDING 심사 대기) localStorage에 보관하고,
  // 「팝업 조회/수정」 표가 이 목록을 함께 보여준다. 자세한 구조는 lib/popupDrafts.ts.
  const draftParam = searchParams.get("draft");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  useEffect(() => {
    if (!draftParam || editId) return;
    const d = findDraft(draftParam);
    if (!d) return;
    setActiveDraftId(d.id);
    setTitle(d.title);
    setDescription(d.description);
    setNotice(d.notice);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setOpenTime(d.openTime);
    setCloseTime(d.closeTime);
    setSameHours(d.sameHours);
    if (d.dayHours?.length === 7) setDayHours(d.dayHours);
    setDirectAddress(d.directAddress);
    setZonecode(d.zonecode);
    setTags(d.tags);
    setCats(d.cats);
    setRegionId(d.regionId);
    setSnsLinks(d.snsLinks);
    setOpsMode(d.opsMode);
    setMaxCapacity(d.maxCapacity);
    setSlotUnit(d.slotUnit);
    setSlotCapacity(d.slotCapacity);
    setMaxPartyPerTeam(d.maxPartyPerTeam);
    if (d.directAddress) previewOnMap(d.directAddress);
  }, [draftParam, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = () => {
    const id = activeDraftId ?? String(Date.now());
    upsertDraft({
      id, savedAt: new Date().toISOString(),
      title, description, notice, startDate, endDate, openTime, closeTime,
      sameHours, dayHours, directAddress, zonecode, tags, cats, regionId,
      snsLinks, opsMode, maxCapacity, slotUnit, slotCapacity, maxPartyPerTeam,
    });
    setActiveDraftId(id);
    navigate("/seller/popups");
  };

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

  // 「주소 검색」 — 네이버 지오코딩 검색 패널을 바로 연다 (7/30).
  // 그 전에는 다음 우편번호 팝업을 먼저 시도했는데, 키 없이 쓰는 외부 위젯이라 환경에 따라
  // 로드가 자주 막혔고 성공해도 팝업 열기→검색→선택 3번을 눌러야 했다.
  // 지금은 주소칸에 적힌 값으로 즉시 후보를 검색하므로: 버튼 1번 → 후보 선택 1번이면 끝.
  const openAddressSearch = () => {
    setMapError("");
    setFallbackOpen(true);
    setFallbackQuery(directAddress);
    if (directAddress.trim()) runFallbackSearch(directAddress);
  };

  // 주소 후보 검색 — 네이버 지오코딩이 돌려준 목록을 보여준다.
  // q를 직접 받는 이유: openAddressSearch가 setFallbackQuery 직후 부르는데 state는 아직 이전 값이라서.
  const runFallbackSearch = async (q?: string) => {
    const query = (q ?? fallbackQuery).trim();
    if (!query) return;
    setFallbackBusy(true);
    setMapError("");
    try {
      const list = await searchAddressByNaver(query);
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

    // 요일별 운영시간 — 「모든 요일 동일」이면 7일 같은 값으로 펼쳐 전송한다.
    // startDate·endDate의 시각 부분은 슬롯 생성 창으로 쓰이므로, 요일별 시간이 갈릴 때는
    // 그 합집합(가장 이른 오픈 ~ 가장 늦은 마감)을 준다 — 슬롯은 요일 구분 없이 한 창으로 생성된다.
    const operatingHours: OperatingHoursItem[] = DAY_CODES.map((code, i) =>
      sameHours
        ? { dayOfWeek: code, openTime, closeTime, closed: false }
        : dayHours[i].closed
          ? { dayOfWeek: code, openTime: null, closeTime: null, closed: true }
          : { dayOfWeek: code, openTime: dayHours[i].open, closeTime: dayHours[i].close, closed: false },
    );
    const openDays = operatingHours.filter((h) => !h.closed);
    if (openDays.length === 0) return setError("모든 요일이 휴무입니다. 운영 요일을 하나 이상 남겨 주세요.");
    const earliestOpen = openDays.map((h) => h.openTime!).reduce((a, b) => (a < b ? a : b));
    const latestClose = openDays.map((h) => h.closeTime!).reduce((a, b) => (a > b ? a : b));

    const payload = {
      // 반려된 팝업을 다시 올릴 때만 상태를 PENDING으로 되돌려 심사 대기열에 다시 넣는다.
      // 그 외(정상 수정)에는 status를 아예 보내지 않아 서버가 현재 상태를 그대로 유지하게 한다 —
      // 게시중인(OPEN) 팝업을 고쳤다고 심사 대기로 내려가면 소비자 화면에서 사라진다.
      ...(isRejected ? { status: "PENDING" as PopupStatusCode } : {}),
      title: title.trim(),
      description: description.trim(),
      location: directAddress.trim(),
      startDate: `${startDate}T${earliestOpen}:00`,
      endDate: `${endDate}T${latestClose}:00`,
      operatingHours, // 7/30 jsw — 요일별 운영시간·휴무 실저장
      notice: notice.trim() || undefined, // 유의사항 (소비자 상세 안내)
      // 현장 웨이팅 팀당 최대 인원 — 웨이팅을 받는 운영 방식일 때만 의미가 있다
      ...(opsMode !== "RESERVATION" && maxPartyPerTeam !== "" ? { maxPartySizePerTeam: Number(maxPartyPerTeam) } : {}),
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
      // 수정 화면에서 X로 빼둔 기존 이미지를 먼저 지운다.
      // 올리기 전에 지워야 서버가 매기는 sortOrder가 빈 자리 없이 이어진다.
      for (const id of removedImageIds) {
        await deletePopupImage(popup.id, id);
      }
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
      // 임시저장으로 시작한 등록이 서버에 들어갔으면 초안은 소임을 다했다 — 목록에 유령으로 남지 않게 제거
      if (activeDraftId) removeDraft(activeDraftId);
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
      <div className="max-w-xl mx-auto mt-16 bg-card border border-border rounded-sm p-10 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4" />
        <h1 className="text-lg font-semibold mb-2">{isRejected ? "재심사 요청이 접수되었습니다" : "승인 요청이 접수되었습니다"}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          플랫폼 운영팀이 24시간 내에 {isRejected ? "수정된" : "등록"} 내용을 검수합니다.<br />
          심사 결과는 「팝업 조회/수정」에서 확인할 수 있으며, 승인 즉시 소비자 서비스에 게시됩니다.
        </p>
        {slotProgress && (
          <p className="text-xs text-emerald-600 mb-6 -mt-3">{slotProgress} — 「예약 슬롯·명단」에서 확인하세요.</p>
        )}
        <button onClick={() => navigate("/seller/popups")} className="text-xs px-5 py-2.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90">
          게시 상태 확인하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-5 items-start">
      {/* 좌측 섹션 내비게이션 */}
      <nav className="hidden xl:flex flex-col w-44 shrink-0 sticky top-20 bg-card border border-border rounded-sm py-2">
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <a key={id} href={`#${id}`} className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-accent hover:bg-accent/5">
            <Icon size={13} /> {label}
          </a>
        ))}
      </nav>

      {/* 본문 폼 */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold">
            {isSuspendedEdit ? "게시중지 팝업 재등록" : isRejected ? "반려 팝업 재등록" : editId ? "팝업 수정" : "팝업 등록"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRejected
              ? `${isSuspendedEdit ? "게시중지" : "반려"} 사유를 반영해 수정한 뒤 재등록하면 심사 대기 상태로 다시 접수됩니다.`
              : <>모든 항목을 입력한 뒤 승인 요청하면 운영팀 검수 후 게시됩니다. <Req /> 표시는 필수 항목입니다.</>}
          </p>
        </div>

        {/* 반려·게시중지 사유 — 무엇을 고쳐야 하는지 폼 맨 위에서 바로 보이게 (7/29) */}
        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              <strong>{isSuspendedEdit ? "관리자 게시중지 사유" : "관리자 반려 사유"}</strong>
              <p className="mt-1 text-red-600">{rejectReason ?? "사유가 기록되지 않았습니다. 운영팀에 문의해 주세요."}</p>
            </div>
          </div>
        )}

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
              <label className={labelCls}>브랜드명</label>
              <input
                value={companyName}
                readOnly
                placeholder="계정 정보를 불러오는 중…"
                className={inputCls + " bg-secondary/40 text-muted-foreground cursor-not-allowed"}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                가입한 사업자 정보에서 자동으로 들어갑니다 · 변경은 <Link to="/seller/mypage" className="underline underline-offset-2 hover:text-accent">마이페이지</Link>에서
              </p>
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
                          ? "bg-accent text-accent-foreground border-accent"
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
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputBase + " w-32"} />
                <span className="text-muted-foreground">—</span>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputBase + " w-32"} />
              </div>
            ) : (
              /* 7/30 — 상태(dayHours)와 실제로 연결. 그 전에는 defaultValue만 있는 장식이라 입력해도 저장되지 않았다. */
              <div className="flex flex-col gap-1.5">
                {DAYS.map((d, i) => (
                  <div key={d} className="flex items-center gap-2 text-[13px]">
                    <span className="w-6 text-xs text-muted-foreground">{d}</span>
                    <input
                      type="time" value={dayHours[i].open} disabled={dayHours[i].closed}
                      onChange={(e) => setDayHour(i, { open: e.target.value })}
                      className={inputBase + " w-32 disabled:opacity-40"}
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="time" value={dayHours[i].close} disabled={dayHours[i].closed}
                      onChange={(e) => setDayHour(i, { close: e.target.value })}
                      className={inputBase + " w-32 disabled:opacity-40"}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2 cursor-pointer">
                      <input
                        type="checkbox" checked={dayHours[i].closed}
                        onChange={(e) => setDayHour(i, { closed: e.target.checked })}
                        className="accent-[#E85D3C]"
                      /> 휴무
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

            {/* 주소 검색 패널 — 네이버 지오코딩 후보에서 선택하면 주소·우편번호·좌표가 한 번에 채워진다 */}
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
                    onClick={() => runFallbackSearch()} // 직접 넘기면 클릭 이벤트가 q 인자로 들어간다
                    disabled={fallbackBusy}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 shrink-0"
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
                  <ul className="max-h-44 overflow-y-auto divide-y divide-border bg-card border border-border rounded-sm">
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
                acceptFiles(Array.from(e.target.files ?? []), "thumb"); // 드롭과 같은 규칙을 타게 한다
                e.target.value = ""; // 같은 파일을 다시 고를 수 있게 비운다
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => onDragOver(e, "thumb")}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, "thumb")}
              className={`w-full h-32 border-2 border-dashed rounded-sm flex flex-col items-center justify-center gap-2 text-xs transition-colors ${dropZoneCls("thumb")}`}
            >
              <Upload size={18} />
              {dragOver === "thumb" ? "여기에 놓으면 추가됩니다" : "클릭하거나 파일을 끌어다 놓으세요 (등록 완료 시 서버로 전송됩니다)"}
            </button>
            {/* 이미 서버에 올라가 있는 썸네일 (수정 모드) */}
            {serverThumbs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {serverThumbs.map((img) => (
                  <ExistingImage
                    key={img.id}
                    img={img}
                    removed={removedImageIds.includes(img.id)}
                    onRemove={() => markImageRemoved(img.id)}
                    onUndo={() => undoImageRemoved(img.id)}
                  />
                ))}
              </div>
            )}
            {images.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {images.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs bg-secondary px-3 py-1.5 rounded-sm">
                    <span className="w-5 h-5 rounded-sm bg-card border border-border flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                    <ImageIcon size={11} className="shrink-0" /> <span className="truncate">{f.name}</span>
                    <span className="ml-auto flex items-center gap-0.5 shrink-0">
                      <button type="button" title="위로" disabled={i === 0} onClick={() => moveFile("thumb", i, -1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25">
                        <ArrowUp size={12} />
                      </button>
                      <button type="button" title="아래로" disabled={i === images.length - 1} onClick={() => moveFile("thumb", i, 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25">
                        <ArrowDown size={12} />
                      </button>
                      <button type="button" title="제거" onClick={() => setImages(images.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">순서대로 업로드되며, 첫 번째가 대표 썸네일이 됩니다.</p>
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
                className={inputBase + " w-36 shrink-0"}
              >
                {SNS_PLATFORMS.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <input
                /* flex-1 + min-w-0 — 긴 URL을 넣어도 칸이 부모를 밀어내지 않고 그 안에서 줄어든다 */
                className={inputBase + " flex-1 min-w-0"}
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
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-card shrink-0">
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
            {/* 7/30 — 백엔드 maxPartySizePerTeam 연동. 웨이팅을 받는 방식일 때만 의미가 있어 조건부 노출 */}
            {opsMode !== "RESERVATION" && (
              <div>
                <label className={labelCls}>
                  웨이팅 팀당 최대 인원 <span className="font-normal text-muted-foreground">(선택 — 비우면 제한 없음)</span>
                </label>
                <input
                  type="number" min={1} value={maxPartyPerTeam}
                  onChange={(e) => setMaxPartyPerTeam(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputCls}
                  placeholder="예: 4"
                />
              </div>
            )}
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
            {/* 7/30 — 백엔드 notice 컬럼 연동. 소비자 상세페이지의 유의사항 안내로 노출된다 */}
            <label className={labelCls}>
              유의사항 <span className="font-normal text-muted-foreground">(선택 — 소비자 상세페이지에 안내로 노출)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              className={inputCls + " resize-y leading-relaxed"}
              placeholder={"예: 반려동물 동반 불가 · 재입장 불가 · 인근 주차 공간 없음 (대중교통 이용 권장)"}
            />
          </div>
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
                acceptFiles(Array.from(e.target.files ?? []), "detail");
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => detailInputRef.current?.click()}
              onDragOver={(e) => onDragOver(e, "detail")}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, "detail")}
              className={`w-full h-20 border-2 border-dashed rounded-sm flex items-center justify-center gap-2 text-xs transition-colors ${dropZoneCls("detail")}`}
            >
              <Upload size={15} />
              {dragOver === "detail" ? "여기에 놓으면 추가됩니다" : "클릭하거나 파일을 끌어다 놓으세요 (여러 장 가능)"}
            </button>
            {/* 이미 서버에 올라가 있는 상세 이미지 (수정 모드) */}
            {serverDetails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {serverDetails.map((img) => (
                  <ExistingImage
                    key={img.id}
                    img={img}
                    removed={removedImageIds.includes(img.id)}
                    onRemove={() => markImageRemoved(img.id)}
                    onUndo={() => undoImageRemoved(img.id)}
                  />
                ))}
              </div>
            )}
            {detailImages.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {detailImages.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs bg-secondary px-3 py-2 rounded-sm">
                    <span className="w-5 h-5 rounded-sm bg-card border border-border flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                    <ImageIcon size={13} className="shrink-0" /> <span className="truncate">{f.name}</span>
                    <span className="text-muted-foreground shrink-0">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
                    <span className="ml-auto flex items-center gap-0.5 shrink-0">
                      <button type="button" title="위로" disabled={i === 0} onClick={() => moveFile("detail", i, -1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25">
                        <ArrowUp size={12} />
                      </button>
                      <button type="button" title="아래로" disabled={i === detailImages.length - 1} onClick={() => moveFile("detail", i, 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25">
                        <ArrowDown size={12} />
                      </button>
                      <button type="button" title="제거" onClick={() => setDetailImages(detailImages.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* 하단 액션 바 — 임시저장은 7/30부터 실제로 저장한다 (그 전엔 목록 이동만 하는 장식이었다) */}
        <div className="sticky bottom-0 bg-card border border-border rounded-sm px-5 py-3 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {editId
              ? "수정 중인 팝업은 임시저장 없이 「수정 저장」으로만 반영됩니다."
              : "임시저장하면 「팝업 조회/수정」 표에 남아 이어서 작성할 수 있습니다. (이 브라우저에만 보관 · 이미지 제외)"}
          </p>
          <div className="flex gap-2 ml-auto">
            {editId ? (
              <button type="button" onClick={() => navigate("/seller/popups")} className="text-xs px-4 py-2.5 border border-border rounded-sm hover:bg-secondary">
                취소
              </button>
            ) : (
              <button type="button" onClick={saveDraft} className="text-xs px-4 py-2.5 border border-border rounded-sm hover:bg-secondary">
                임시저장
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="text-xs px-6 py-2.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 font-medium disabled:opacity-50"
            >
              {submitting ? "전송 중…" : isRejected ? "재등록 (재심사 요청)" : editId ? "수정 저장" : "승인 요청 (게시 신청)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
