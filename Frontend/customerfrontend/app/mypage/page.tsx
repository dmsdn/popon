// app/mypage/page.tsx
// 마이페이지 - 찜/웨이팅·예약/다녀간 팝업/알림 설정/화면 설정을 모아둔 메인 허브
"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAnnouncements, type Announcement } from "@/lib/api/announcements";
import { getMyReviews, deleteReview, toDisplayDate, type Review } from "@/lib/api/reviews";
import { getPopup, getPopupSlots, HIDDEN_STATUSES, type PopupDetail, type PopupSlot } from "@/lib/api/popups";
import { getMyReservations, type Reservation } from "@/lib/api/reservations";
import { getMyWaitingStatus, getMyWaitingIds, getMyActiveWaitings, getWaitingBoard, type Waiting, type MyActiveWaiting } from "@/lib/api/waiting";
import { createCsRequest, getMyCsRequests, type CsRequestItem } from "@/lib/api/cs";
import { TERMS_SECTIONS } from "@/data/termsContent";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { reservationStatusLabel, waitingStatusLabel } from "@/lib/utils/statusLabels";
import { isTodayClosed } from "@/lib/utils/operatingHours";
import { getNotificationSettings, updateNotificationSettings, type NotificationSettings } from "@/lib/api/notificationSettings";
import { getRegions, getMyRegions } from "@/lib/api/regions";
import { getKeywords, getMyInterests, withdrawCustomer } from "@/lib/api/customer";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  getServerWishlistSnapshot,
  ensureWishlistLoaded,
  toggleWishlist,
} from "@/lib/wishlistStore";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { HeartButton } from "@/components/ui/HeartButton";
import { appAlert, appConfirm } from "@/lib/ui/alertStore";

type MenuKey =
  | "내 정보"
  | "찜 목록"
  | "웨이팅 / 예약"
  | "다녀간 팝업"
  | "알림 설정"
  | "화면 설정"
  | "공지사항"
  | "1:1 문의"
  | "Q&A"
  | "약관";

// 화면 설정 - 로그인 무관 로컬 설정이라 PUBLIC_MENU 소속
const PUBLIC_MENU: MenuKey[] = ["화면 설정", "공지사항", "1:1 문의", "Q&A", "약관"];
const PRIVATE_MENU: MenuKey[] = ["찜 목록", "웨이팅 / 예약", "다녀간 팝업", "알림 설정"];
const SIDEBAR_MENU: MenuKey[] = [...PRIVATE_MENU, ...PUBLIC_MENU];

const PROVIDER_LABEL = {
  KAKAO: "카카오 연결",
  GOOGLE: "구글 연결",
  DEV: "개발용 로그인",
} as const;

const FAQS = [
  { q: "웨이팅은 어떻게 신청하나요?", a: "팝업 상세페이지의 '웨이팅' 버튼에서 카카오 로그인으로 바로 신청할 수 있어요." },
  { q: "예약 취소는 어디서 하나요?", a: "마이페이지 > 웨이팅 / 예약에서 취소할 예약을 선택해 취소할 수 있어요." },
];

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return "미입력";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "미입력";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayThisYear =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthdayThisYear) age -= 1;
  return `만 ${age}세`;
}

const VALID_MENUS: MenuKey[] = ["내 정보", ...SIDEBAR_MENU];

export default function MyPage() {
  return (
    <Suspense>
      <MyPageContent />
    </Suspense>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isLoggedIn, loading, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState<MenuKey>("내 정보");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const DEFAULT_NOTIF_SETTINGS = [
    { id: "popup", label: "팝업 소식 알림", enabled: true },
    { id: "reservation", label: "예약 · 웨이팅 알림", enabled: true },
    { id: "marketing", label: "마케팅 정보 수신", enabled: false },
  ];
  // id(화면용) <-> 백엔드 필드명 매핑
  const NOTIF_FIELD_BY_ID: Record<string, keyof NotificationSettings> = {
    popup: "popupNewsAgreed",
    reservation: "reservationWaitingAgreed",
    marketing: "marketingAgreed",
  };
  // 알림 설정 - 서버 저장값 조회 (localStorage 아님), 비로그인 시 호출 안 함
  const [notifSettings, setNotifSettings] = useState(DEFAULT_NOTIF_SETTINGS);
  useEffect(() => {
    if (!customer) return;
    getNotificationSettings()
      .then((res) => {
        setNotifSettings((prev) =>
          prev.map((item) => ({ ...item, enabled: res[NOTIF_FIELD_BY_ID[item.id]] ?? item.enabled }))
        );
      })
      .catch((err) => console.error("알림 설정 조회 실패", err));
  }, [customer]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 다녀간 팝업 (= 내가 쓴 후기)
  const [myReviews, setMyReviews] = useState<Review[] | null>(null);
  // 후기 삭제 성공 시 목록에서도 즉시 제거
  const handleDeleteVisitedReview = (reviewId: number) => {
    setMyReviews((prev) => (prev ? prev.filter((r) => r.id !== reviewId) : prev));
  };
  const [popupTitles, setPopupTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    getMyReviews()
      .then((list) => {
        if (cancelled) return;
        setMyReviews(list);
        // 리뷰에 달린 popupId들의 제목을 한 번씩만 조회
        const uniqueIds = [...new Set(list.map((r) => r.popupId))];
        uniqueIds.forEach((popupId) => {
          getPopup(popupId)
            .then((detail) => {
              if (!cancelled) {
                setPopupTitles((prev) => ({ ...prev, [popupId]: detail.title }));
                setReservationPopupImages((prev) => ({ ...prev, [popupId]: detail.thumbnailImages?.[0] }));
              }
            })
            .catch(() => {
              /* 팝업이 삭제됐을 수도 있어요 - 제목 없이 표시 */
            });
        });
      })
      .catch((err) => {
        console.error("다녀간 팝업(내 후기) 조회 실패", err);
        setMyReviews([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // 찜 목록
  const wishlistIds = useSyncExternalStore(subscribeWishlist, getWishlistSnapshot, getServerWishlistSnapshot);
  const [wishlistPopups, setWishlistPopups] = useState<Record<number, PopupDetail>>({});
  // 찜 목록에서 하트를 눌러 해제한 카드는 서버에서는 즉시 찜 해제되지만,현재 화면에서는 새로고침/페이지 재진입 전까지 잠깐 남겨둠
  // 실수로 눌렀다면 같은 화면에서 다시 하트를 눌러 되돌릴 수 있음
  const [locallyUnwishlistedIds, setLocallyUnwishlistedIds] = useState<Set<number>>(new Set());
  const [wishlistWaitingTeams, setWishlistWaitingTeams] = useState<Record<number, number | null>>({});
  const [wishlistSlots, setWishlistSlots] = useState<Record<number, PopupSlot[]>>({});
  // 다녀간 팝업 - 후기 크게보기 모달 상태
  const [openVisitedReview, setOpenVisitedReview] = useState<
    (VisitedItem & { review: NonNullable<VisitedItem["review"]> }) | null
  >(null);
  // 게시중지/승인대기/반려 팝업 - 찜·예약·웨이팅 목록에서 공통 제외
  const [hiddenPopupIds, setHiddenPopupIds] = useState<Set<number>>(new Set());
  const markIfHidden = (popupId: number, status: string) => {
    if (HIDDEN_STATUSES.has(status)) {
      setHiddenPopupIds((prev) => new Set(prev).add(popupId));
    }
  };
  // 찜 배지 개수 - 목록과 동일 기준(hiddenPopupIds 제외) 적용
  const visibleWishlistIds = [...new Set([...wishlistIds, ...locallyUnwishlistedIds])].filter(
    (id) => !hiddenPopupIds.has(id)
  );
  const visibleWishlistCount = visibleWishlistIds.length;

  useEffect(() => {
    if (isLoggedIn) ensureWishlistLoaded();
  }, [isLoggedIn]);

  useEffect(() => {
    wishlistIds.forEach((popupId) => {
      if (wishlistPopups[popupId]) return;
      getPopup(popupId)
        .then((detail) => {
          setWishlistPopups((prev) => ({ ...prev, [popupId]: detail }));
          markIfHidden(popupId, detail.status);

          // 상세페이지와 동일하게, 이 팝업이 실제로 지원하는 웨이팅/예약만
          // 찜 목록 카드에 노출하고 웨이팅 버튼에는 현재 대기 팀 수도 표시
          if (detail.queueMode === "ONSITE_WAITING_ONLY" || detail.queueMode === "BOTH") {
            getWaitingBoard(popupId)
              .then((board) => {
                setWishlistWaitingTeams((prev) => ({ ...prev, [popupId]: board.totalWaitingTeams }));
              })
              .catch(() => {
                setWishlistWaitingTeams((prev) => ({ ...prev, [popupId]: null }));
              });
          }

          if (detail.reservationMode === "SLOT") {
            getPopupSlots(popupId)
              .then((slotList) => {
                setWishlistSlots((prev) => ({ ...prev, [popupId]: slotList }));
              })
              .catch(() => {
                setWishlistSlots((prev) => ({ ...prev, [popupId]: [] }));
              });
          }
        })
        .catch(() => {
          /* 팝업이 삭제됐을 수도 있어요 */
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistIds]);

  // 웨이팅 / 예약
  const [myReservations, setMyReservations] = useState<Reservation[] | null>(null);
  const [myWaitings, setMyWaitings] = useState<Waiting[]>([]);
  // 활성 웨이팅 개수/목록 - 실 API(getMyActiveWaitings) 기반 별도 state (myWaitings는 다녀간 팝업 판단용으로 유지)
  const [myActiveWaitings, setMyActiveWaitings] = useState<MyActiveWaiting[]>([]);
  const [reservationPopupTitles, setReservationPopupTitles] = useState<Record<number, string>>({});
  const [reservationPopupImages, setReservationPopupImages] = useState<Record<number, string | undefined>>({});

  useEffect(() => {
    if (!isLoggedIn || !customer) return;
    let cancelled = false;

    getMyReservations(customer.id)
      .then((list) => {
        if (!cancelled) {
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setMyReservations(sorted);
        }
      })
      .catch((err) => {
        console.error("내 예약 조회 실패", err);
        if (!cancelled) setMyReservations([]);
      });

    // myWaitings - 다녀간 팝업 판단용 (이 브라우저 기록 id만 조회하는 한계 있음)
    Promise.all(
      getMyWaitingIds().map((id) =>
        getMyWaitingStatus(id).catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        setMyWaitings(
          results
            .filter((w): w is Waiting => w !== null)
            .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
        );
      }
    });

    // 웨이팅/예약 개수·목록 - 실 API 결과 사용
    getMyActiveWaitings(customer.id)
      .then((list) => {
        if (!cancelled) setMyActiveWaitings(list);
      })
      .catch((err) => {
        console.error("내 활성 웨이팅 조회 실패", err);
        if (!cancelled) setMyActiveWaitings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  // 예약/웨이팅에 뜬 팝업들의 제목을 한 번씩만 조회
  useEffect(() => {
    const popupIds = [
      ...(myReservations ?? []).map((r) => r.popupId),
      ...myWaitings.map((w) => w.popupId),
      // myActiveWaitings popupId도 포함 (다른 기기 웨이팅의 이미지/게시중지 여부 조회)
      ...myActiveWaitings.map((w) => w.popupId),
    ];
    [...new Set(popupIds)].forEach((popupId) => {
      if (reservationPopupTitles[popupId]) return;
      getPopup(popupId)
        .then((detail) => {
          setReservationPopupTitles((prev) => ({ ...prev, [popupId]: detail.title }));
          setReservationPopupImages((prev) => ({ ...prev, [popupId]: detail.thumbnailImages?.[0] }));
          markIfHidden(popupId, detail.status);
        })
        .catch(() => {
          /* 팝업이 삭제됐을 수도 있어요 */
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReservations, myWaitings, myActiveWaitings]);

  // 1:1 문의
  const [myCsRequests, setMyCsRequests] = useState<CsRequestItem[] | null>(null);
  const [csTitle, setCsTitle] = useState("");

  // 팝업 상세 "문의하기"에서 진입 시 제목 프리필
  useEffect(() => {
    const prefillTitle = searchParams.get("prefillTitle");
    if (prefillTitle) setCsTitle(prefillTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [csContent, setCsContent] = useState("");
  const [csSubmitting, setCsSubmitting] = useState(false);

  // 공지사항 - 마찬가지로 로그인 여부 상관없는 공개 정보
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    if (activeMenu !== "공지사항" || announcements) return;
    let cancelled = false;

    getAnnouncements()
      .then((list) => {
        if (!cancelled) setAnnouncements(list);
      })
      .catch((err) => {
        console.error("공지사항 조회 실패", err);
        if (!cancelled) setAnnouncements([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMenu, announcements]);

  useEffect(() => {
    if (!isLoggedIn || !customer) return;
    let cancelled = false;

    getMyCsRequests(customer.id)
      .then((list) => {
        if (!cancelled) {
          setMyCsRequests(
            [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          );
        }
      })
      .catch((err) => {
        console.error("내 문의 조회 실패", err);
        if (!cancelled) setMyCsRequests([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  const handleSubmitCsRequest = async () => {
    if (!customer || !csTitle.trim() || !csContent.trim()) return;
    setCsSubmitting(true);
    try {
      const created = await createCsRequest(customer.id, {
        title: csTitle.trim(),
        content: csContent.trim(),
      });
      setMyCsRequests((prev) => [created, ...(prev ?? [])]);
      setCsTitle("");
      setCsContent("");
    } catch (err) {
      console.error("문의 등록 실패", err);
      await appAlert(err instanceof Error ? err.message : "문의 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setCsSubmitting(false);
    }
  };

  // 관심 지역/카테고리 - 실 API 연결 (동네 단위 지역, 키워드 조회)
  const [preferredRegions, setPreferredRegionsState] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategoriesState] = useState<string[]>([]);

  useEffect(() => {
    if (!customer) return;
    Promise.all([getRegions(), getMyRegions()])
      .then(([all, mine]) => {
        const nameById = new Map(all.map((r) => [r.id, r.name]));
        setPreferredRegionsState(
          (mine?.regionIds ?? []).map((id) => nameById.get(id)).filter((n): n is string => !!n)
        );
      })
      .catch((err) => console.error("관심 지역 조회 실패", err));
    Promise.all([getKeywords(), getMyInterests()])
      .then(([all, mine]) => {
        const nameById = new Map(all.map((k) => [k.id, k.name]));
        setPreferredCategoriesState(
          (mine?.keywordIds ?? []).map((id) => nameById.get(id)).filter((n): n is string => !!n)
        );
      })
      .catch((err) => console.error("관심 카테고리 조회 실패", err));
  }, [customer]);

  // /mypage?menu=공지사항 처럼 쿼리로 들어오면 해당 메뉴가 바로 선택된 상태로 열립니다.
  const queryMenu = searchParams.get("menu");

  // 외부 링크(?menu=X)로 진입 시 뒤로가기는 진짜 브라우저 back, 내부 탭 이동 시엔 마이페이지 목록으로
  const cameFromExternalLink = useRef(queryMenu !== null);

  // 마이페이지는 로그인 전용 (공개 메뉴는 /login으로 이동됨) - 비로그인 시 /login 리다이렉트
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  // ?menu 쿼리 반영 - 정식 useEffect로 처리 (loading 포함해 재확인)
  useEffect(() => {
    if (!queryMenu) {
      // 뒤로가기 등으로 menu 쿼리파라미터가 사라지면(브라우저 히스토리를 실제로 되돌아온 경우) 목록 화면으로
      setMobileView("list");
      return;
    }
    if (!(VALID_MENUS as string[]).includes(queryMenu)) return;
    if (loading || !isLoggedIn) return; // 위 리다이렉트 effect가 처리
    setActiveMenu(queryMenu as MenuKey);
    setMobileView("detail");
  }, [queryMenu, loading, isLoggedIn]);


  const handleSelectMenu = (menu: MenuKey) => {
    const isPrivate = (PRIVATE_MENU as string[]).includes(menu) || menu === "내 정보";
    if (isPrivate && !isLoggedIn) {
      router.push("/login");
      return;
    }
    // 탭 이동 - replace() 사용(히스토리 미누적), 외부 링크 진입 플래그 해제
    cameFromExternalLink.current = false;
    setActiveMenu(menu);
    setMobileView("detail");
    router.replace(`/mypage?menu=${encodeURIComponent(menu)}`);
  };

  // 목록↔상세 전환 - 로컬 상태만 변경 (외부 링크 진입 시엔 진짜 back 사용)
  const handleBackToList = () => {
    if (cameFromExternalLink.current) {
      router.back();
      return;
    }
    setMobileView("list");

    router.replace("/mypage");
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    router.push("/");
  };

  // 회원탈퇴 - 실 API(withdrawCustomer) 연결
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const handleConfirmWithdraw = async () => {
    setWithdrawing(true);
    try {
      await withdrawCustomer();
      logout();
      setShowWithdrawConfirm(false);
      router.push("/");
    } catch (err) {
      console.error("회원탈퇴 실패", err);
      await appAlert("탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
      setWithdrawing(false);
    }
  };

  const toggleNotif = (id: string) => {
    setNotifSettings((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      const changed = next.find((item) => item.id === id)!;
      updateNotificationSettings({ [NOTIF_FIELD_BY_ID[id]]: changed.enabled }).catch((err) => {
        console.error("알림 설정 저장 실패", err);
        // 저장 실패해도 일단 화면엔 반영된 채로 둬요 - 다음 방문 때 서버값으로 다시 맞춰짐
      });
      return next;
    });
  };

  // 전체 알림 토글 - 세 설정 한 번에 on/off
  const allNotifEnabled = notifSettings.every((item) => item.enabled);
  const toggleAllNotif = () => {
    const nextEnabled = !allNotifEnabled;
    setNotifSettings((prev) => prev.map((item) => ({ ...item, enabled: nextEnabled })));
    updateNotificationSettings(
      Object.fromEntries(Object.values(NOTIF_FIELD_BY_ID).map((field) => [field, nextEnabled]))
    ).catch((err) => console.error("알림 설정 저장 실패", err));
  };

  // 활성 개수 - 웨이팅+예약 합산, 취소건/게시중지·승인대기·반려 팝업 제외 (하단바 배지와 기준 통일)
  const activeCount =
    myActiveWaitings.filter((w) => !hiddenPopupIds.has(w.popupId)).length +
    (myReservations?.filter((r) => r.status !== "CANCELLED" && !hiddenPopupIds.has(r.popupId)).length ?? 0);

  // 다녀간 팝업 - 팝업 하나당 카드 하나로 통합(예약/웨이팅+후기 중복 카드 방지). visitMethod는 예약/웨이팅 중 하나만 표시
  type VisitedItem = {
    id: string;
    popupId: number;
    title: string;
    visitMethod: "reservation" | "waiting" | null;
    visitDate: string | null; // 다녀온 날짜
    review: {
      reviewId: number;
      rating: number | null;
      content: string;
      photos: string[];
      likeCount: number;
      createdAt: string; // 작성한 날짜
    } | null;
  };

  const visitedItems: VisitedItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byPopup = new Map<number, VisitedItem>();
    const ensure = (popupId: number, title: string) => {
      let entry = byPopup.get(popupId);
      if (!entry) {
        entry = { id: `visited-${popupId}`, popupId, title, visitMethod: null, visitDate: null, review: null };
        byPopup.set(popupId, entry);
      }
      return entry;
    };
    const titleFor = (popupId: number) =>
      reservationPopupTitles[popupId] ?? popupTitles[popupId] ?? `팝업 #${popupId}`;

    // 다녀감 판단 - CHECKED_IN 또는 예약일 경과(취소 제외)
    (myReservations ?? []).forEach((r) => {
      if (r.status === "CANCELLED") return;
      const visited = r.entryStatus === "CHECKED_IN" || (!!r.reservationDate && new Date(r.reservationDate) < today);
      if (!visited) return;
      const entry = ensure(r.popupId, titleFor(r.popupId));
      entry.visitMethod = "reservation";
      if (!entry.visitDate) entry.visitDate = r.reservationDate ?? null;
    });

    myWaitings
      .filter((w) => !!w.enteredAt)
      .forEach((w) => {
        const entry = ensure(w.popupId, titleFor(w.popupId));
        // 한 팝업에 예약·웨이팅 기록이 둘 다 있는 드문 경우엔 예약 쪽을 우선
        if (!entry.visitMethod) entry.visitMethod = "waiting";
        if (!entry.visitDate && w.enteredAt) entry.visitDate = (w.enteredAt as string).slice(0, 10);
      });

    (myReviews ?? []).forEach((r) => {
      const entry = ensure(r.popupId, popupTitles[r.popupId] ?? titleFor(r.popupId));
      entry.review = {
        reviewId: r.id,
        rating: r.rating,
        content: r.content,
        photos: r.imageUrls,
        likeCount: r.likeCount,
        createdAt: r.createdAt,
      };
      if (!entry.visitDate && r.visitDate) entry.visitDate = r.visitDate;
    });

    return [...byPopup.values()].sort((a, b) => {
      const aDate = a.review?.createdAt ?? a.visitDate ?? "";
      const bDate = b.review?.createdAt ?? b.visitDate ?? "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [myReviews, myReservations, myWaitings, popupTitles, reservationPopupTitles]);

  // 조기 return은 모든 훅 호출 이후에 위치 (훅 순서 일관성 유지)
  if (loading || !isLoggedIn || !customer) return null;

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div
        className={`${
          mobileView === "detail" ? "hidden mobile:flex" : "flex"
        } items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]`}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">내 정보</h1>
      </div>

      <div className="flex flex-col mobile:flex-row">
        <aside
          className={`${mobileView === "detail" ? "hidden mobile:block" : "block"} mobile:w-[240px] mobile:border-r border-gray-100 dark:border-[#282B32] py-6`}
        >
          {/* 렌더 가드 통과 후라 항상 로그인 상태 */}
          <>
              <button
                type="button"
                onClick={() => handleSelectMenu("내 정보")}
                className="w-full flex flex-col items-center mobile:items-start px-4 mobile:px-6 mb-6"
              >
                <div className="w-16 h-16 rounded-full bg-gray-200 mb-3 overflow-hidden">
                  {customer.profileImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.profileImage} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium">{customer.nickname} 님</p>
              </button>

              {/* 찜/웨이팅·예약 카드 - 모바일은 구분선 있는 2칸 박스, 웹은 한 줄 리스트. 0개도 그대로 0 표시 */}
              <div className="mobile:hidden grid grid-cols-2 rounded-xl bg-gray-100 dark:bg-[#282B32] mx-4 mb-4 divide-x divide-gray-200 dark:divide-[#17181a]">
                <button
                  type="button"
                  onClick={() => handleSelectMenu("찜 목록")}
                  className="flex flex-col items-center py-4"
                >
                  {/* 다크모드 대응 + 강조 스타일 */}
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {visibleWishlistCount}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">찜</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMenu("웨이팅 / 예약")}
                  className="flex flex-col items-center py-4"
                >
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {activeCount}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">웨이팅 / 예약</span>
                </button>
              </div>

              <div className="hidden mobile:flex flex-col gap-1 px-6 mb-4">
                <button
                  type="button"
                  onClick={() => handleSelectMenu("찜 목록")}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-left bg-gray-50 dark:bg-[#282B32]"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">찜</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{visibleWishlistCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMenu("웨이팅 / 예약")}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-left bg-gray-50 dark:bg-[#282B32]"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">웨이팅 / 예약</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{activeCount}</span>
                </button>
              </div>
            </>

          <nav className="flex flex-col">
            {(isLoggedIn ? SIDEBAR_MENU : PUBLIC_MENU).map((menu) => (
              <button
                key={menu}
                type="button"
                onClick={() => handleSelectMenu(menu)}
                className={`w-full text-left px-4 mobile:px-6 py-3.5 text-sm ${
                  activeMenu === menu && mobileView === "detail"
                    ? "font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-[#282B32]"
                    : "text-gray-700 dark:text-gray-300 mobile:hover:bg-gray-50 dark:mobile:hover:bg-[#282B32]"
                }`}
              >
                {menu}
              </button>
            ))}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full text-left px-4 mobile:px-6 py-3.5 text-sm text-gray-700 dark:text-gray-300"
              >
                로그아웃
              </button>
            )}
          </nav>
        </aside>

        <section className={`${mobileView === "list" ? "hidden mobile:block" : "block"} flex-1 px-4 mobile:px-10 py-6`}>
          <button
            type="button"
            onClick={handleBackToList}
            className="mobile:hidden flex items-center gap-2 mb-4"
          >
            <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
            <span className="text-lg font-bold">{activeMenu}</span>
          </button>

          {activeMenu === "내 정보" && customer && (
            <div>
              <div className="flex items-center gap-3 py-4 border-b border-gray-50 dark:border-[#282B32]">
                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-none">
                  {customer.profileImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.profileImage} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium">{customer.nickname} 님</p>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">닉네임</span>
                <span className="text-sm text-gray-500">{customer.nickname}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">연결된 로그인</span>
                <span
                  className={`flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 ${
                    customer.provider === "KAKAO" ? "bg-[#FEE500] text-gray-900" : "bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {customer.provider === "KAKAO" ? (
                    <img src="/icons/ui/kakao.svg" alt="Kakao" className="w-4 h-4" />
                  ) : customer.provider === "GOOGLE" ? (
                    <img src="/icons/ui/google.svg" alt="Google" className="w-4 h-4" />
                  ) : (
                    <img src="/icons/ui/admin.svg" alt="Admin" className="w-4 h-4" />
                  )}{" "}
                  {PROVIDER_LABEL[customer.provider]}
                </span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">전화번호</span>
                <span className="text-sm text-gray-500">{customer.phone || "미입력"}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">이메일</span>
                <span className="text-sm text-gray-500">{customer.email || "미입력"}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">성별</span>
                <span className="text-sm text-gray-500">
                  {customer.gender === "MALE" ? "남성" : customer.gender === "FEMALE" ? "여성" : "미입력"}
                </span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">나이</span>
                <span className="text-sm text-gray-500">{calculateAge(customer.birthDate)}</span>
              </div>

              <div className="py-4 border-b border-gray-50 dark:border-[#282B32]">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">관심 카테고리</p>
                {preferredCategories.length === 0 ? (
                  <p className="text-sm text-gray-400">아직 선택한 관심 카테고리가 없어요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredCategories.map((c) => (
                      <span key={c} className="text-sm bg-gray-100 dark:bg-[#282B32] text-gray-600 dark:text-gray-400 rounded-full px-2.5 py-1">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="py-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">관심 지역</p>
                {preferredRegions.length === 0 ? (
                  <p className="text-sm text-gray-400">아직 선택한 관심 지역이 없어요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredRegions.map((r) => (
                      <span key={r} className="text-sm bg-gray-100 dark:bg-[#282B32] text-gray-600 dark:text-gray-400 rounded-full px-2.5 py-1">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/mypage/edit"
                className="block w-full text-center border border-gray-300 dark:border-[#282B32] rounded-full py-3 text-sm font-medium mt-6"
              >
                수정하기
              </Link>

              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(true)}
                className="text-sm text-gray-500 mt-8"
              >
                회원 탈퇴 ›
              </button>
            </div>
          )}

          {activeMenu === "찜 목록" &&
            (visibleWishlistCount === 0 ? (
              <EmptyState message="찜한 팝업이 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {visibleWishlistIds.map((popupId) => {
                    const p = wishlistPopups[popupId];
                    if (!p) return null;

                    const supportsWaiting = p.queueMode === "ONSITE_WAITING_ONLY" || p.queueMode === "BOTH";
                    const reservationSupportedByMode =
                      p.queueMode === "PRERESERVATION_ONLY" || p.queueMode === "BOTH";
                    const reservationSlotsReady =
                      p.reservationMode !== "SLOT" ||
                      (wishlistSlots[popupId] !== undefined && wishlistSlots[popupId].length > 0);
                    const supportsReservation = reservationSupportedByMode && reservationSlotsReady;
                    const waitingEnabled =
                      supportsWaiting &&
                      p.status === "OPEN" &&
                      !isTodayClosed(p.operatingHours);
                    const reservationEnabled =
                      supportsReservation &&
                      (p.status === "OPEN" || p.status === "BEFOR");
                    const waitingTeams = wishlistWaitingTeams[popupId] ?? null;

                    return (
                      <div
                        key={popupId}
                        className="relative flex flex-col gap-3 border border-gray-200 dark:border-[#282B32] rounded-xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Link href={`/popup/${popupId}`} className="flex items-center gap-4 flex-1 min-w-0 pr-10">
                            <div className="w-24 h-24 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                              {p.thumbnailImages?.[0] ? (
                                <ImageWithFallback src={p.thumbnailImages[0]} className="w-full h-full object-cover" />
                              ) : (
                                "이미지"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{p.title}</p>
                              {p.location && <p className="text-sm text-gray-400 mt-0.5">{p.location}</p>}
                            </div>
                          </Link>

                          <div className="absolute top-3 right-3">
                            <HeartButton
                              popupId={popupId}
                              className="w-8 h-8"
                              onToggle={(nextActive) => {
                                if (!nextActive) {
                                  setLocallyUnwishlistedIds((prev) => {
                                    const next = new Set(prev);
                                    next.add(popupId);
                                    return next;
                                  });
                                } else {
                                  setLocallyUnwishlistedIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(popupId);
                                    return next;
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>

                        {(supportsReservation || supportsWaiting) && (
                          <div className="flex items-center gap-2">
                            {supportsReservation && (
                              <Link
                                href={`/popup/${popupId}?action=reservation`}
                                aria-disabled={!reservationEnabled}
                                className={`flex-1 text-center rounded-full py-3 text-base font-medium border-2 border-point text-gray-900 dark:text-white ${
                                  !reservationEnabled ? "opacity-40 pointer-events-none" : ""
                                }`}
                              >
                                {reservationEnabled
                                  ? "사전 예약"
                                  : p.status === "CLOSED"
                                  ? "종료된 팝업이에요"
                                  : "예약 준비중"}
                              </Link>
                            )}

                            {supportsWaiting && (
                              <Link
                                href={`/popup/${popupId}?action=waiting`}
                                aria-disabled={!waitingEnabled}
                                className={`flex-1 text-center rounded-full py-3 text-base font-medium bg-point text-gray-900 dark:text-white ${
                                  !waitingEnabled ? "opacity-40 pointer-events-none" : ""
                                }`}
                              >
                                {p.status === "CLOSED"
                                  ? "종료된 팝업이에요"
                                  : !waitingEnabled
                                  ? isTodayClosed(p.operatingHours)
                                    ? "오늘은 휴무일이에요"
                                    : "웨이팅 준비중"
                                  : waitingTeams !== null && waitingTeams > 0
                                  ? `웨이팅 · ${waitingTeams}팀 대기중`
                                  : "웨이팅"}
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          {activeMenu === "웨이팅 / 예약" && (
            <div className="flex flex-col gap-10">
              <section>
                <h2 className="text-sm font-semibold mb-3">웨이팅</h2>
                {myActiveWaitings.length === 0 ? (
                  <EmptyState message="진행 중인 웨이팅이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {myActiveWaitings.filter((w) => !hiddenPopupIds.has(w.popupId)).map((w) => (
                      <Link
                        key={w.waitingId}
                        href={`/waiting/${w.waitingId}`}
                        className="block border border-gray-200 dark:border-[#282B32] rounded-xl p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-24 h-24 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                            {reservationPopupImages[w.popupId] ? (
                              <ImageWithFallback
                                src={reservationPopupImages[w.popupId]!}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              "이미지"
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1">{w.popupTitle}</p>
                            <p className="text-sm text-gray-500">
                              앞 {w.teamsAhead}팀 · {waitingStatusLabel(w.status)}
                            </p>
                          </div>
                          <div className="text-right flex-none">
                            <span className="text-3xl font-semibold">{w.teamNumber}</span>
                            <span className="text-sm text-gray-500 ml-0.5">번째</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold mb-3">예약</h2>
                {myReservations === null ? (
                  <LoadingState />
                ) : myReservations.length === 0 ? (
                  <EmptyState message="예약 내역이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {myReservations.filter((r) => !hiddenPopupIds.has(r.popupId)).map((r) => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className="flex items-center gap-4 border border-gray-200 dark:border-[#282B32] rounded-xl p-5"
                      >
                        <div className="w-24 h-24 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                          {reservationPopupImages[r.popupId] ? (
                            <ImageWithFallback
                              src={reservationPopupImages[r.popupId]!}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "이미지"
                          )}
                        </div>
                        <div>
                          <span className="inline-block text-sm text-gray-500 mb-1">
                            {reservationStatusLabel(r.status)}
                          </span>
                          <p className="text-sm font-semibold mb-1">
                            {reservationPopupTitles[r.popupId] ?? `팝업 #${r.popupId}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {r.reservationDate
                              ? `${r.reservationDate}${r.reservationTime ? ` ${r.reservationTime.slice(0, 5)}` : ""}`
                              : "시간대 예약"}{" "}
                            · {r.partySize}명
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeMenu === "다녀간 팝업" &&
            (myReviews === null || myReservations === null ? (
              <LoadingState />
            ) : visitedItems.length === 0 ? (
              <EmptyState message="다녀간 팝업이 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {visitedItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 dark:border-[#282B32] rounded-xl overflow-hidden">
                    {/* 팝업 카드 - 예약/웨이팅 배지(방문방법 없으면 숨김), 다녀온 날짜 표시 */}
                    <Link href={`/popup/${item.popupId}`} className="flex items-center gap-3 p-4 pb-3">
                      <div className="w-16 h-16 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                        {reservationPopupImages[item.popupId] ? (
                          <ImageWithFallback src={reservationPopupImages[item.popupId]!} className="w-full h-full object-cover" />
                        ) : (
                          "이미지"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.visitMethod && (
                            <span className="text-sm font-medium bg-gray-100 dark:bg-[#282B32] text-gray-500 rounded px-1.5 py-0.5 flex-none">
                              {item.visitMethod === "reservation" ? "예약" : "웨이팅"}
                            </span>
                          )}
                          <p className="text-sm font-semibold truncate">{item.title}</p>
                        </div>
                        {item.visitDate && (
                          <span className="text-sm text-gray-400">{item.visitDate} 다녀옴</span>
                        )}
                      </div>
                    </Link>

                    {/* 후기 본문 - 클릭 시 큰 화면으로, 작성일은 별점 옆 */}
                    {item.review ? (
                      <button
                        type="button"
                        onClick={() => setOpenVisitedReview({ ...item, review: item.review! })}
                        className="block w-full text-left px-4 pb-3"
                      >
                        <p className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                          {item.review.rating != null ? (
                            <>
                              <StarRatingDisplay rating={item.review.rating} size={12} /> {item.review.rating}
                            </>
                          ) : (
                            <span className="text-gray-400">방문 미인증 댓글</span>
                          )}
                          <span className="text-gray-400">· {toDisplayDate(item.review.createdAt)} 작성</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{item.review.content}</p>
                        {item.review.photos.length > 0 && (
                          <div className="flex gap-1.5">
                            {item.review.photos.slice(0, 4).map((photo) => (
                              <ImageWithFallback
                                key={photo}
                                src={photo}
                                className="w-16 h-16 rounded-lg object-cover flex-none"
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/popup/${item.popupId}/review`}
                        className="flex items-center justify-between px-4 pb-3 text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-400">방문 완료 · 아직 댓글/후기를 남기지 않았어요</span>
                        <span className="text-gray-900 dark:text-white font-medium flex-none ml-2">후기 남기기 ›</span>
                      </Link>
                    )}

                    {/* 후기 수정/삭제 버튼 + 추천 수 */}
                    {item.review && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 dark:border-[#17181a]">
                        <span className="text-sm text-gray-400">
                          추천 {item.review.likeCount > 0 ? item.review.likeCount : 0}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/popup/${item.popupId}/review?editId=${item.review!.reviewId}`)}
                            className="text-sm font-medium text-gray-500"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!(await appConfirm("이 후기를 삭제할까요?"))) return;
                              try {
                                await deleteReview(item.review!.reviewId);
                                handleDeleteVisitedReview(item.review!.reviewId);
                              } catch (err) {
                                console.error("후기 삭제 실패", err);
                                await appAlert("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
                              }
                            }}
                            className="text-sm font-medium text-gray-500"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

          {activeMenu === "알림 설정" && (
            <div className="flex flex-col gap-6">
              {/* 전체 토글 - 카드로 분리, 상세 항목과 구분 */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[#1c1d20] px-4 py-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">전체</span>
                {/* ON 상태 포인트컬러 + thumb 이동 수정 */}
                <button
                  type="button"
                  onClick={toggleAllNotif}
                  aria-pressed={allNotifEnabled}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    allNotifEnabled ? "bg-point" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      allNotifEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">상세 설정</p>
                <div className="flex flex-col">
                  {notifSettings.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => toggleNotif(item.id)}
                        aria-pressed={item.enabled}
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          item.enabled ? "bg-point" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            item.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 화면 설정 - 다크모드 토글 */}
          {activeMenu === "화면 설정" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
                <span className="text-sm text-gray-700 dark:text-gray-300">다크모드</span>
                <ThemeToggle />
              </div>
            </div>
          )}

          {activeMenu === "공지사항" && (
            <div className="flex flex-col">
              {!announcements ? (
                <LoadingState />
              ) : announcements.length === 0 ? (
                <EmptyState message="등록된 공지사항이 없어요." />
              ) : (
                announcements.map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/notice/${notice.id}`}
                    className="block py-4 border-b border-gray-50 dark:border-[#282B32]"
                  >
                    <p className="text-sm text-gray-800 dark:text-white">{notice.title}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeMenu === "약관" && (
            <div className="flex flex-col gap-8">
              {TERMS_SECTIONS.map((section) => (
                <div key={section.id} id={`terms-${section.id}`}>
                  <p className="text-base font-semibold mb-3">{section.title}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          )}

          {activeMenu === "1:1 문의" && (
            <div>
              <p className="text-sm text-gray-500 mb-6">
                궁금하거나 불편한 점이 있으면 언제든 문의해 주세요. 영업일 기준 1~2일 내에 답변드려요.
              </p>

              {!isLoggedIn || !customer ? (
                <Link
                  href="/login"
                  className="block w-full text-center rounded-full py-3.5 text-sm font-medium bg-point text-gray-900 dark:text-white"
                >
                  로그인하고 문의하기
                </Link>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4">
                    <input
                      type="text"
                      value={csTitle}
                      onChange={(e) => setCsTitle(e.target.value)}
                      placeholder="제목"
                      className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none"
                    />
                    <textarea
                      value={csContent}
                      onChange={(e) => setCsContent(e.target.value)}
                      placeholder="문의 내용을 입력해 주세요."
                      rows={5}
                      className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitCsRequest}
                    disabled={csSubmitting || !csTitle.trim() || !csContent.trim()}
                    className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {csSubmitting ? "등록하는 중..." : "문의하기"}
                  </button>

                  <div className="mt-8 flex flex-col gap-3">
                    {myCsRequests === null ? (
                      <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>
                    ) : myCsRequests.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">아직 문의한 내역이 없어요.</p>
                    ) : (
                      myCsRequests.map((cs) => (
                        <div key={cs.id} className="border border-gray-100 dark:border-[#282B32] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">{cs.title}</p>
                            <span
                              className={`text-sm px-2 py-0.5 rounded-full ${
                                cs.status === "ANSWERED" ? "bg-gray-900 text-white" : "bg-gray-100 dark:bg-[#282B32] text-gray-500"
                              }`}
                            >
                              {cs.status === "ANSWERED" ? "답변완료" : "답변대기"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">{cs.content}</p>
                          {cs.answerContent && (
                            <div className="bg-gray-50 rounded-lg px-3 py-2 mt-2">
                              <p className="text-sm text-gray-400 mb-1">답변</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cs.answerContent}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeMenu === "Q&A" && (
            <div className="flex flex-col">
              {FAQS.map((faq, index) => (
                <div key={faq.q} className="border-b border-gray-50 dark:border-[#282B32]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between py-4 text-left"
                  >
                    <span className="text-sm text-gray-800 dark:text-white">{faq.q}</span>
                    <span className="text-sm text-gray-400">{openFaq === index ? "−" : "+"}</span>
                  </button>
                  {openFaq === index && <p className="text-sm text-gray-500 dark:text-gray-400 pb-4">{faq.a}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="bg-white dark:bg-[#282B32] rounded-xl px-6 py-6 w-full max-w-xs">
            <p className="text-sm font-medium text-center mb-6">로그아웃 하시겠어요?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 rounded-full py-3 text-base font-medium bg-gray-900 text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="bg-white dark:bg-[#282B32] rounded-xl px-6 py-6 w-full max-w-xs">
            <p className="text-sm font-medium text-center mb-2">정말 탈퇴하시겠어요?</p>
            <p className="text-sm text-gray-400 text-center mb-6">
              찜, 예약, 웨이팅, 후기 내역이 모두 사라지고 되돌릴 수 없어요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(false)}
                disabled={withdrawing}
                className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 dark:bg-[#282B32] text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing}
                className="flex-1 rounded-full py-3 text-base font-medium bg-red-500 text-white disabled:opacity-50"
              >
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 다녀간 팝업 - 후기 크게보기 모달 */}
      {openVisitedReview && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50"
          onClick={() => setOpenVisitedReview(null)}
        >
          <div
            className="bg-white dark:bg-[#282B32] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#17181a]">
              <p className="text-base font-bold truncate">{openVisitedReview.title}</p>
              <button
                type="button"
                onClick={() => setOpenVisitedReview(null)}
                aria-label="닫기"
                className="text-gray-400 text-lg flex-none ml-3"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                {openVisitedReview.review.rating != null ? (
                  <>
                    <StarRatingDisplay rating={openVisitedReview.review.rating} size={16} /> {openVisitedReview.review.rating}
                  </>
                ) : (
                  <span className="text-gray-400">방문 미인증 댓글</span>
                )}
                {/* 작성일 - 별점 옆 표시 */}
                <span className="text-gray-400">· {toDisplayDate(openVisitedReview.review.createdAt)} 작성</span>
              </p>
              {openVisitedReview.review.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mb-4">
                  {openVisitedReview.review.photos.map((photo) => (
                    <ImageWithFallback
                      key={photo}
                      src={photo}
                      className="w-40 h-40 flex-none rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {openVisitedReview.review.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
