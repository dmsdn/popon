"use client";

// 마이페이지 - 찜/웨이팅·예약/다녀간 팝업/알림 설정/화면 설정을 모아둔 메인 허브. 이 프로젝트에서 가장 큰 파일이에요.

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAnnouncements, type Announcement } from "@/lib/api/announcements";
import { getMyReviews, deleteReview, toDisplayDate, type Review } from "@/lib/api/reviews";
import { getPopup, HIDDEN_STATUSES, type PopupDetail } from "@/lib/api/popups";
import { getMyReservations, type Reservation } from "@/lib/api/reservations";
import { getMyWaitingStatus, getMyWaitingIds, type Waiting } from "@/lib/api/waiting";
import { createCsRequest, getMyCsRequests, type CsRequestItem } from "@/lib/api/cs";
import { TERMS_SECTIONS } from "@/data/termsContent";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { reservationStatusLabel, waitingStatusLabel } from "@/lib/utils/statusLabels";
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

// [수정 8/5] "화면 설정"(다크모드 토글)은 로그인 여부와 무관한 순수 로컬 설정인데
// PRIVATE_MENU에 있어서 로그아웃 상태에서는 사이드바에 항목 자체가 안 보이고,
// 직접 ?menu=화면 설정으로 들어와도 로그인 페이지로 튕겨나갔어요. 실제로 이
// 메뉴의 내용(<ThemeToggle />)도 customer 정보를 전혀 안 써서, 로그인 여부를
// 따질 이유가 없는 항목이에요. PUBLIC_MENU로 옮겨서 로그아웃 상태에서도 쓸 수
// 있게 했어요.
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
  // [수정] localStorage 대신 실제 계정에 저장된 값을 서버에서 가져와요 - 로그인
  // 안 한 상태에선 호출 안 함(401 방지), 기본값 유지.
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
  // [신규] "다녀간 팝업"에서 내 후기 삭제 - 성공하면 목록에서도 바로 빼줘요.
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
  // [신규] "다녀간 팝업" 탭에서 후기를 누르면 크게 보여줄 모달 상태
  const [openVisitedReview, setOpenVisitedReview] = useState<
    (VisitedItem & { review: NonNullable<VisitedItem["review"]> }) | null
  >(null);
  // [신규] 게시중지(SUSPENDED)/승인대기/반려된 팝업은 찜·예약·웨이팅 목록에서도
  // 똑같이 숨겨요 - 게시중지되면 알림이 이미 가니까, 목록에는 안 보여도 괜찮다고
  // 하셨어요. 팝업을 조회할 때마다 여기 기록해두고, 세 목록 렌더링에서 공통으로 걸러내요.
  const [hiddenPopupIds, setHiddenPopupIds] = useState<Set<number>>(new Set());
  const markIfHidden = (popupId: number, status: string) => {
    if (HIDDEN_STATUSES.has(status)) {
      setHiddenPopupIds((prev) => new Set(prev).add(popupId));
    }
  };

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

    // ⚠️ 백엔드에 "내 웨이팅 전체 목록" API가 없어서, 이 브라우저에서 등록할 때
    // 기록해둔 id들로 하나씩 상태를 조회해요 (lib/api/waiting.ts의 addMyWaitingId 참고).
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

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, customer]);

  // 예약/웨이팅에 뜬 팝업들의 제목을 한 번씩만 조회
  useEffect(() => {
    const popupIds = [
      ...(myReservations ?? []).map((r) => r.popupId),
      ...myWaitings.map((w) => w.popupId),
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
  }, [myReservations, myWaitings]);

  // 1:1 문의
  const [myCsRequests, setMyCsRequests] = useState<CsRequestItem[] | null>(null);
  const [csTitle, setCsTitle] = useState("");

  // [신규] 팝업 상세페이지 "문의하기" 버튼에서 넘어온 경우, 어떤 팝업/브랜드에
  // 대한 문의인지 제목에 미리 채워둬요.
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

  // [수정] 로컬 저장(lib/preferences.ts) 대신 실제 관심 지역/카테고리 API로 교체 -
  // 백엔드 region이 이제 동네 단위로 바뀌었고, 키워드 조회 API도 새로 생겼어요.
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

  // 비로그인 상태에서도 마이페이지 자체는 보여주고(공지사항/1:1 문의/Q&A는 로그인 없이도 봐야 하니까),
  // 로그인이 필요한 메뉴를 고르려고 할 때만 로그인 화면으로 보냅니다. (handleSelectMenu 참고)

  // /mypage?menu=공지사항 처럼 쿼리로 들어오면 해당 메뉴가 바로 선택된 상태로 열립니다.
  const queryMenu = searchParams.get("menu");

  // [신규] "/mypage?menu=알림 설정"처럼 알림 목록의 톱니바퀴 아이콘 같은
  // 외부 링크에서 특정 메뉴로 바로 들어온 경우, 뒤로가기를 누르면 원래 있던
  // 화면(예: 알림 목록)으로 돌아가야 자연스러워요. 근데 지금까지는 마이페이지
  // 안에서 탭을 이동한 것과 똑같이 취급해서 "마이페이지 목록 화면"으로만
  // 보내고 있었어요 - 그 목록 화면 헤더가 "내 정보"라고 적혀있어서 마치
  // "내 정보로 이동한 것"처럼 보였던 거예요.
  // 이 컴포넌트가 처음 그려질 때 이미 menu 쿼리파라미터가 있었는지를 기억해뒀다가,
  // 그런 경우에만 뒤로가기가 진짜 브라우저 back(=진입 전 화면으로)이 되도록 했어요.
  // 마이페이지 안에서 직접 다른 메뉴를 눌러 이동하면(handleSelectMenu) 이 플래그를
  // 꺼서, 그 다음부터는 기존처럼 "마이페이지 목록 화면"으로 돌아가요.
  const cameFromExternalLink = useRef(queryMenu !== null);

  // [수정 8/5] "화면 설정/공지사항/1:1 문의/Q&A/약관" 같은 로그인 없이도 보던
  // 공개 메뉴들을 /login 페이지 쪽으로 옮겼어요(로그인 버튼 바로 아래에 같이
  // 있어요). 그래서 마이페이지는 이제 로그인된 사용자 전용이에요 - 로그인 안
  // 한 상태로 들어오면(직접 URL 접근, 북마크 등) 무조건 /login으로 보내요.
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  // [수정] 렌더링 도중(컴포넌트 함수 본문)에서 setState를 호출하던 방식이었는데,
  // loading이 true인 동안 한 번 처리되고 나면 나중에 loading이 풀려도 다시 안
  // 돌아서, 새로고침 시 비로그인 사용자가 로그인 필요한 탭에 잠깐 들어가 있는 등
  // 불안정했어요. 정식 useEffect로 바꾸고, loading 상태도 deps에 포함시켜서
  // loading이 풀리는 시점에 다시 한번 정확히 확인하도록 했어요.
  useEffect(() => {
    if (!queryMenu) {
      // 뒤로가기 등으로 menu 쿼리파라미터가 사라지면(브라우저 히스토리를 실제로
      // 되돌아온 경우) 목록 화면으로 돌아가요.
      setMobileView("list");
      return;
    }
    if (!(VALID_MENUS as string[]).includes(queryMenu)) return;
    if (loading || !isLoggedIn) return; // 위 리다이렉트 effect가 처리해요.
    setActiveMenu(queryMenu as MenuKey);
    setMobileView("detail");
  }, [queryMenu, loading, isLoggedIn]);


  const handleSelectMenu = (menu: MenuKey) => {
    const isPrivate = (PRIVATE_MENU as string[]).includes(menu) || menu === "내 정보";
    if (isPrivate && !isLoggedIn) {
      router.push("/login");
      return;
    }
    // [수정] 탭을 여러 개 옮겨다니면 push()가 매번 히스토리를 쌓아서, 뒤로가기를
    // 눌렀을 때 "마이페이지 진입 전"이 아니라 "직전에 봤던 탭들"을 하나씩
    // 거쳐가는 문제가 있었어요. replace()로 바꿔서 마이페이지 안에서 탭을
    // 아무리 옮겨다녀도 히스토리 엔트리가 하나만 남게 했어요 - 뒤로가기 한 번에
    // 바로 마이페이지 진입 전 화면으로 나가요.
    // [신규] 이제부터는 마이페이지 "안에서" 옮겨다니는 거니까, 외부 링크로
    // 들어왔었다는 플래그는 꺼요 - 이 다음 뒤로가기는 마이페이지 목록 화면으로.
    cameFromExternalLink.current = false;
    setActiveMenu(menu);
    setMobileView("detail");
    router.replace(`/mypage?menu=${encodeURIComponent(menu)}`);
  };

  // [수정] 목록↔상세 전환은 이제 URL/히스토리와 무관한 순수 로컬 상태예요 -
  // router.back()을 쓰면 (탭 전환이 이제 replace라) 마이페이지 밖으로
  // 나가버려서, 그냥 상태만 되돌려요.
  // [신규] 단, 알림 목록 등 외부 링크에서 특정 메뉴로 바로 들어온 경우엔 예외 -
  // 그때는 뒤로가기를 누르면 마이페이지 목록이 아니라 원래 있던 화면(예: 알림
  // 목록)으로 돌아가야 하니, 진짜 브라우저 back을 써요.
  const handleBackToList = () => {
    if (cameFromExternalLink.current) {
      router.back();
      return;
    }
    setMobileView("list");
    // URL의 menu 파라미터도 같이 지워요 - 안 지우면 목록 화면에서 새로고침했을 때
    // 여전히 남아있는 ?menu=X 때문에 다시 상세 화면으로 돌아가버려요.
    router.replace("/mypage");
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    router.push("/");
  };

  // [신규] 회원탈퇴 - 기존엔 "준비 중이에요" 알럿만 뜨고 실제로 아무 일도 안
  // 일어났는데, DB에 실제로 연결된 withdrawCustomer(DELETE /api/customer/me)가
  // 이미 있어서 로그아웃과 같은 방식(확인 모달)으로 연결했어요.
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

  // [신규] "전체" 토글 - 세 개 설정을 한 번에 켜거나 꺼요.
  const allNotifEnabled = notifSettings.every((item) => item.enabled);
  const toggleAllNotif = () => {
    const nextEnabled = !allNotifEnabled;
    setNotifSettings((prev) => prev.map((item) => ({ ...item, enabled: nextEnabled })));
    updateNotificationSettings(
      Object.fromEntries(Object.values(NOTIF_FIELD_BY_ID).map((field) => [field, nextEnabled]))
    ).catch((err) => console.error("알림 설정 저장 실패", err));
  };

  // 웨이팅 + 예약을 합친 총 "대기중" 건수 - 프로필 아래 바로가기 카드 분기에 씁니다.
  const activeCount = myWaitings.length + (myReservations?.length ?? 0);

  // "다녀간 팝업" - 예전엔 후기/예약/웨이팅을 각각 따로 카드로 만들어서, 예약해서
  // 다녀온 뒤 후기까지 쓴 팝업이 "예약(방문 완료·후기 남기기)" 카드랑 "후기" 카드
  // 두 개로 중복돼서 보였어요(후기를 썼는데도 "아직 후기를 안 남겼다"는 카드가
  // 안 사라지는 문제였어요). 이제 팝업 하나당 카드 하나로 합쳤어요:
  // - 어떻게 이용했는지(visitMethod)는 "예약" 또는 "웨이팅" 둘 중 하나만 표시하고,
  //   앱으로 방문한 기록 없이 댓글만 남긴 경우는 아예 표시 안 해요.
  // - 후기(review)가 있으면 후기 내용을, 없으면 "후기 남기기" 유도를 보여줘요.
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

    // [수정] 이전엔 entryStatus가 "CHECKED_IN"(직원이 직접 체크인 처리)인 예약만 다녀간
    // 걸로 쳤어요. 근데 체크인 처리를 안 해도 예약 날짜 자체가 지났으면 "다녀간" 걸로
    // 보는 게 자연스러워서, 취소되지 않은 예약 중 날짜가 지난 것도 포함시켰어요.
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
        // 한 팝업에 예약·웨이팅 기록이 둘 다 있는 드문 경우엔 예약 쪽을 우선해요.
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
      // 후기 자체에 방문일이 찍혀있으면(백엔드가 방문 기록에서 자동으로 채워줘요)
      // 그걸 다녀온 날짜로 보강해요.
      if (!entry.visitDate && r.visitDate) entry.visitDate = r.visitDate;
    });

    return [...byPopup.values()].sort((a, b) => {
      const aDate = a.review?.createdAt ?? a.visitDate ?? "";
      const bDate = b.review?.createdAt ?? b.visitDate ?? "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [myReviews, myReservations, myWaitings, popupTitles, reservationPopupTitles]);

  // [수정] 이 조기 return이 이전엔 hooks 중간에 있어서 "Rendered more hooks than
  // during the previous render" 에러가 났었어요. 모든 useState/useEffect/useMemo가
  // 끝난 뒤, 화면을 그리기 직전으로 옮겼어요 - React 훅은 매 렌더링마다 정확히
  // 같은 순서로 호출돼야 해서, 훅들 사이에 조건부 return이 끼어있으면 안 돼요.
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
          {/* isLoggedIn과 customer 둘 다 위 렌더 가드
              (if (loading || !isLoggedIn || !customer) return null)를
              통과했다는 뜻이라 여기서부턴 항상 true/non-null이에요 - 게스트용
              분기를 없애고 로그인 사용자 콘텐츠만 남겼어요. */}
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

              {/* [수정] 예전엔 웨이팅/예약이 합쳐진 카드 하나만 있어서 찜한 개수는
                  아예 안 보였어요. 찜 / 웨이팅·예약을 각각 개수와 함께 보여주는
                  카드 2개로 나눴어요.
                  [수정] 웹(넓은 화면)에서는 카드 그리드 대신, 라벨은 왼쪽/개수는
                  오른쪽에 붙는 한 줄짜리 리스트로 따로 보여줘요. */}
              {/* [수정] 참고 이미지처럼 박스 하나 안에 세로 구분선(|)으로 나눈
                  두 칸으로 합쳤어요. 숫자는 가운데 정렬, "개"는 뺐어요.
                  [수정] 개수가 0일 때 "둘러보기"라고 대신 표시하던 걸 없애고,
                  다른 숫자와 마찬가지로 그냥 0으로 보여줘요 - 실제 개수를
                  정확하게 보여주는 게 우선이라고 판단했어요. */}
              <div className="mobile:hidden grid grid-cols-2 rounded-xl bg-gray-100 dark:bg-[#282B32] mx-4 mb-4 divide-x divide-gray-200 dark:divide-[#17181a]">
                <button
                  type="button"
                  onClick={() => handleSelectMenu("찜 목록")}
                  className="flex flex-col items-center py-4"
                >
                  {/* [수정] text-gray-800에 dark: 짝이 없어서 다크모드에서 숫자가
                      거의 안 보였어요. 라벨보다 눈에 띄도록 크고 굵게, 다크모드에서도
                      확실히 밝게 나오도록 고쳤어요. */}
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {wishlistIds.size}
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
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">웨이팅 · 예약</span>
                </button>
              </div>

              <div className="hidden mobile:flex flex-col gap-1 px-6 mb-4">
                <button
                  type="button"
                  onClick={() => handleSelectMenu("찜 목록")}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-left bg-gray-50 dark:bg-[#282B32]"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">찜</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{wishlistIds.size}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMenu("웨이팅 / 예약")}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-left bg-gray-50 dark:bg-[#282B32]"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">웨이팅 · 예약</span>
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

              <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
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
            (wishlistIds.size === 0 ? (
              <EmptyState message="찜한 팝업이 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {[...wishlistIds].filter((popupId) => !hiddenPopupIds.has(popupId)).map((popupId) => {
                  const p = wishlistPopups[popupId];
                  // [수정] 진행 중이거나 예정인 팝업만 웨이팅/예약 버튼을 보여줘요
                  // (종료된 팝업은 등록해봤자 의미가 없으니까요).
                  const isActionable = p?.status === "OPEN" || p?.status === "BEFOR";
                  return (
                    <div key={popupId} className="relative flex flex-col gap-3 border border-gray-200 dark:border-[#282B32] rounded-xl p-4">
                      <button
                        type="button"
                        onClick={() => toggleWishlist(popupId)}
                        aria-label="찜 해제"
                        className="absolute top-3 right-3 text-gray-300"
                      >
                        ✕
                      </button>
                      <div className="flex items-center gap-4">
                        <Link href={`/popup/${popupId}`} className="flex items-center gap-4 flex-1 min-w-0 pr-6">
                          {/* [수정] 썸네일 크기를 16→24로 키웠어요(너무 작다는 피드백) */}
                          <div className="w-24 h-24 flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                            {p?.thumbnailImages?.[0] ? (
                              <ImageWithFallback src={p.thumbnailImages[0]} className="w-full h-full object-cover" />
                            ) : (
                              "이미지"
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{p?.title ?? `팝업 #${popupId}`}</p>
                            {p?.location && <p className="text-sm text-gray-400 mt-0.5">{p.location}</p>}
                          </div>
                        </Link>
                      </div>
                      {/* [신규] 팝업마다 바로 웨이팅/예약할 수 있는 버튼 - 누르면 상세페이지로
                          가면서 해당 등록 화면이 바로 열려요. */}
                      {isActionable && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/popup/${popupId}?action=waiting`}
                            className="flex-1 text-center text-sm font-medium border border-gray-300 dark:border-[#282B32] text-gray-700 dark:text-gray-300 rounded-full py-2"
                          >
                            웨이팅하기
                          </Link>
                          <Link
                            href={`/popup/${popupId}?action=reservation`}
                            className="flex-1 text-center text-sm font-medium border border-gray-300 dark:border-[#282B32] text-gray-700 dark:text-gray-300 rounded-full py-2"
                          >
                            예약하기
                          </Link>
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
                {myWaitings.length === 0 ? (
                  <EmptyState message="진행 중인 웨이팅이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {myWaitings.filter((w) => !hiddenPopupIds.has(w.popupId)).map((w) => (
                      <Link
                        key={w.id}
                        href={`/waiting/${w.id}`}
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
                            <p className="text-sm font-semibold mb-1">
                              {reservationPopupTitles[w.popupId] ?? `팝업 #${w.popupId}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              앞 {w.teamsAhead}팀 · {w.partySize}명 · {waitingStatusLabel(w.status)}
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
                    {/* [신규] 팝업 카드 - 썸네일 + 이름, 누르면 팝업 상세페이지로 이동.
                        [수정] 배지는 "예약"/"웨이팅" 둘 중 하나만(방문 방법이 없으면
                        아예 안 보여줘요), 다녀온 날짜는 이름 아래에 표시해요. */}
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

                    {/* [수정] 후기 본문은 팝업 카드와 분리해서, 누르면 큰 화면으로
                        내가 쓴 후기를 볼 수 있게 했어요. 작성한 날짜는 별점 옆에 둬요. */}
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

                    {/* [신규] 후기에도 수정/삭제 버튼 + 추천받은 수를 보여줘요. */}
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
              {/* [수정] "전체" 토글을 카드 형태로 분리해서, 아래 상세 항목별
                  토글과 한눈에 구분되게 했어요. */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[#1c1d20] px-4 py-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">전체</span>
                {/* [수정] 켰을 때(ON) 회색이라 눈에 잘 안 띄던 문제 - 포인트 컬러로
                    바꾸고, 원(thumb)이 오른쪽으로 확실히 이동하도록 고쳤어요.
                    (예전엔 ON이 0.5px, OFF가 -20px로 반대로/거의 안 움직였어요.) */}
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

          {/* [신규] 화면 설정 - 다크모드 토글을 여기로 옮겼어요. */}
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
                  className="block w-full text-center rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white"
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
                    className="w-full rounded-full py-3.5 text-base font-medium bg-gray-900 text-white disabled:opacity-50"
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

      {/* [신규] "다녀간 팝업"에서 후기를 누르면 크게 보여주는 모달 */}
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
                {/* [수정] 작성한 날짜를 별점 옆에 표시해요. */}
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