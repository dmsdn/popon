"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { notices } from "@/data/notices";
import { getMyReviews, toDisplayDate, type Review } from "@/lib/api/reviews";
import { getPopup, type PopupDetail } from "@/lib/api/popups";
import { getMyReservations, type Reservation } from "@/lib/api/reservations";
import { getMyWaitingStatus, getMyWaitingIds, type Waiting } from "@/lib/api/waiting";
import { createCsRequest, getMyCsRequests, type CsRequestItem } from "@/lib/api/cs";
import { getTerms, type Terms } from "@/lib/api/terms";
import { getPreferredRegions, getPreferredCategories } from "@/lib/preferences";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  ensureWishlistLoaded,
  toggleWishlist,
} from "@/lib/wishlistStore";

type MenuKey =
  | "내 정보"
  | "찜 목록"
  | "예약 / 웨이팅"
  | "쿠폰함"
  | "다녀간 팝업"
  | "알림 설정"
  | "공지사항"
  | "1:1 문의"
  | "Q&A"
  | "약관";

const PUBLIC_MENU: MenuKey[] = ["공지사항", "1:1 문의", "Q&A", "약관"];
const PRIVATE_MENU: MenuKey[] = ["찜 목록", "예약 / 웨이팅", "쿠폰함", "다녀간 팝업", "알림 설정"];
const SIDEBAR_MENU: MenuKey[] = [...PRIVATE_MENU, ...PUBLIC_MENU];

const PROVIDER_LABEL = {
  KAKAO: "카카오 연결",
  GOOGLE: "구글 연결",
  DEV: "개발용 로그인",
} as const;

const FAQS = [
  { q: "웨이팅은 어떻게 신청하나요?", a: "팝업 상세페이지의 '웨이팅' 버튼에서 카카오 로그인으로 바로 신청할 수 있어요." },
  { q: "예약 취소는 어디서 하나요?", a: "마이페이지 > 예약 / 웨이팅에서 취소할 예약을 선택해 취소할 수 있어요." },
  { q: "쿠폰은 어떻게 받나요?", a: "일부 팝업은 사전 예약/방문 인증 시 쿠폰함에 자동으로 지급돼요." },
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
  const [notifSettings, setNotifSettings] = useState([
    { id: "popup", label: "팝업 소식 알림", enabled: true },
    { id: "reservation", label: "예약 · 웨이팅 알림", enabled: true },
    { id: "marketing", label: "마케팅 정보 수신", enabled: false },
  ]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 다녀간 팝업 (= 내가 쓴 후기)
  const [myReviews, setMyReviews] = useState<Review[] | null>(null);
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
              if (!cancelled) setPopupTitles((prev) => ({ ...prev, [popupId]: detail.title }));
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
  const wishlistIds = useSyncExternalStore(subscribeWishlist, getWishlistSnapshot, () => new Set<number>());
  const [wishlistPopups, setWishlistPopups] = useState<Record<number, PopupDetail>>({});

  useEffect(() => {
    if (isLoggedIn) ensureWishlistLoaded();
  }, [isLoggedIn]);

  useEffect(() => {
    wishlistIds.forEach((popupId) => {
      if (wishlistPopups[popupId]) return;
      getPopup(popupId)
        .then((detail) => {
          setWishlistPopups((prev) => ({ ...prev, [popupId]: detail }));
        })
        .catch(() => {
          /* 팝업이 삭제됐을 수도 있어요 */
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistIds]);

  // 예약 / 웨이팅
  const [myReservations, setMyReservations] = useState<Reservation[] | null>(null);
  const [myWaitings, setMyWaitings] = useState<Waiting[]>([]);
  const [reservationPopupTitles, setReservationPopupTitles] = useState<Record<number, string>>({});

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
  const [csContent, setCsContent] = useState("");
  const [csSubmitting, setCsSubmitting] = useState(false);

  // 약관 - 로그인 여부 상관없이 볼 수 있는 공개 정보라 activeMenu가 "약관"일 때만 불러옵니다.
  const [terms, setTerms] = useState<Terms | null>(null);
  const [termsError, setTermsError] = useState(false);

  useEffect(() => {
    if (activeMenu !== "약관" || terms) return;
    let cancelled = false;

    getTerms()
      .then((data) => {
        if (!cancelled) setTerms(data);
      })
      .catch((err) => {
        console.error("약관 조회 실패", err);
        if (!cancelled) setTermsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMenu, terms]);

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
      alert(err instanceof Error ? err.message : "문의 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setCsSubmitting(false);
    }
  };

  // 관심 지역/카테고리 (로컬 저장 - lib/preferences.ts 참고)
  const [preferredRegions, setPreferredRegionsState] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategoriesState] = useState<string[]>([]);

  useEffect(() => {
    setPreferredRegionsState(getPreferredRegions());
    setPreferredCategoriesState(getPreferredCategories());
  }, []);

  // 비로그인 상태에서도 마이페이지 자체는 보여주고(공지사항/1:1 문의/Q&A는 로그인 없이도 봐야 하니까),
  // 로그인이 필요한 메뉴를 고르려고 할 때만 로그인 화면으로 보냅니다. (handleSelectMenu 참고)

  // /mypage?menu=공지사항 처럼 쿼리로 들어오면 해당 메뉴가 바로 선택된 상태로 열립니다.
  const queryMenu = searchParams.get("menu");
const [syncedQueryMenu, setSyncedQueryMenu] = useState(queryMenu);

if (queryMenu !== syncedQueryMenu) {
  setSyncedQueryMenu(queryMenu);
  if (queryMenu && (VALID_MENUS as string[]).includes(queryMenu)) {
    const isPrivate = (PRIVATE_MENU as string[]).includes(queryMenu) || queryMenu === "내 정보";
    if (isPrivate && !loading && !isLoggedIn) {
      router.replace("/login");
    } else {
      setActiveMenu(queryMenu as MenuKey);
      setMobileView("detail");
    }
  }
}

  // 비로그인 상태로 들어왔는데 아직 기본값(내 정보)이면, 로그인 없이도 볼 수 있는
  // 메뉴로 기본 선택을 바꿔줍니다.
  useEffect(() => {
    if (!loading && !isLoggedIn && activeMenu === "내 정보") {
      setActiveMenu("공지사항");
    }
  }, [loading, isLoggedIn, activeMenu]);

  if (loading) return null;

  const handleSelectMenu = (menu: MenuKey) => {
    const isPrivate = (PRIVATE_MENU as string[]).includes(menu) || menu === "내 정보";
    if (isPrivate && !isLoggedIn) {
      router.push("/login");
      return;
    }
    setActiveMenu(menu);
    setMobileView("detail");
  };

  const handleBackToList = () => setMobileView("list");

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    router.push("/");
  };

  const toggleNotif = (id: string) => {
    setNotifSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  // 웨이팅 + 예약을 합친 총 "대기중" 건수 - 프로필 아래 바로가기 카드 분기에 씁니다.
  const activeCount = myWaitings.length + (myReservations?.length ?? 0);

  // "다녀간 팝업" = 후기를 남긴 것 + 실제로 입장(체크인) 처리된 예약/웨이팅
  // (예약은 entryStatus, 웨이팅은 enteredAt으로 "실제 방문 여부"를 판단해요)
  type VisitedItem =
    | { type: "review"; id: string; popupId: number; title: string; date: string; rating: number; content: string }
    | { type: "reservation" | "waiting"; id: string; popupId: number; title: string; date: string };

  const visitedItems: VisitedItem[] = useMemo(() => {
    const reviewItems: VisitedItem[] = (myReviews ?? []).map((r) => ({
      type: "review",
      id: `review-${r.id}`,
      popupId: r.popupId,
      title: popupTitles[r.popupId] ?? `팝업 #${r.popupId}`,
      date: r.createdAt,
      rating: r.rating,
      content: r.content,
    }));

    const visitedReservations: VisitedItem[] = (myReservations ?? [])
      .filter((r) => r.entryStatus === "CHECKED_IN")
      .map((r) => ({
        type: "reservation",
        id: `reservation-${r.id}`,
        popupId: r.popupId,
        title: reservationPopupTitles[r.popupId] ?? `팝업 #${r.popupId}`,
        date: r.createdAt,
      }));

    const visitedWaitings: VisitedItem[] = myWaitings
      .filter((w) => !!w.enteredAt)
      .map((w) => ({
        type: "waiting",
        id: `waiting-${w.id}`,
        popupId: w.popupId,
        title: reservationPopupTitles[w.popupId] ?? `팝업 #${w.popupId}`,
        date: w.enteredAt as string,
      }));

    return [...reviewItems, ...visitedReservations, ...visitedWaitings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [myReviews, myReservations, myWaitings, popupTitles, reservationPopupTitles]);

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold">내 정보</h1>
      </div>

      <div className="flex flex-col mobile:flex-row">
        <aside
          className={`${mobileView === "detail" ? "hidden mobile:block" : "block"} mobile:w-[240px] mobile:border-r border-gray-100 py-6`}
        >
          {isLoggedIn && customer ? (
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

              {/* 프로필 바로 아래 - 진행 중인 웨이팅/예약 바로가기 카드
                  - 대기중인 게 하나도 없으면(activeCount === 0) 카드 자체를 숨김
                  - 딱 1건이면 그 항목 상세페이지로 바로 이동
                  - 2건 이상이면 문구를 바꾸고, 마이페이지 안의 "예약 / 웨이팅" 탭으로 전환 */}
              {activeCount > 0 &&
                (activeCount === 1 ? (
                  <Link
                    href={
                      myWaitings[0]
                        ? `/waiting/${myWaitings[0].id}`
                        : `/reservations/${myReservations?.[0]?.id}`
                    }
                    className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <span className="text-sm text-gray-700">
                      {myWaitings[0] ? `웨이팅 ${myWaitings[0].teamNumber}번째 대기중` : "예약 1건"}
                    </span>
                    <span className="text-xs text-gray-400">›</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectMenu("예약 / 웨이팅")}
                    className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left"
                  >
                    <span className="text-sm text-gray-700">현재 대기중인 예약 · 웨이팅 내역 확인하기</span>
                    <span className="text-xs text-gray-400">›</span>
                  </button>
                ))}
            </>
          ) : (
            <div className="px-4 mobile:px-6 mb-6">
              <p className="text-sm text-gray-500 mb-3">
                로그인하면 찜 목록, 예약/웨이팅 내역을 확인할 수 있어요.
              </p>
              <Link
                href="/login"
                className="block w-full text-center rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
              >
                로그인 / 회원가입
              </Link>
            </div>
          )}

          <nav className="flex flex-col">
            {(isLoggedIn ? SIDEBAR_MENU : PUBLIC_MENU).map((menu) => (
              <button
                key={menu}
                type="button"
                onClick={() => handleSelectMenu(menu)}
                className={`w-full text-left px-4 mobile:px-6 py-3.5 text-sm ${
                  activeMenu === menu ? "font-semibold text-gray-900 bg-gray-50" : "text-gray-700"
                }`}
              >
                {menu}
              </button>
            ))}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full text-left px-4 mobile:px-6 py-3.5 text-sm text-gray-700"
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
            className="mobile:hidden flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            ‹ 뒤로
          </button>

          {activeMenu === "내 정보" && customer && (
            <div>
              <div className="flex items-center gap-3 py-4 border-b border-gray-50">
                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-none">
                  {customer.profileImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.profileImage} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium">{customer.nickname} 님</p>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">닉네임</span>
                <span className="text-sm text-gray-500">{customer.nickname}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">연결된 로그인</span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
                    customer.provider === "KAKAO" ? "bg-[#FEE500]" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {customer.provider === "KAKAO" ? "💬" : customer.provider === "GOOGLE" ? "G" : "🛠️"}{" "}
                  {PROVIDER_LABEL[customer.provider]}
                </span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">전화번호</span>
                <span className="text-sm text-gray-500">{customer.phone || "미입력"}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">이메일</span>
                <span className="text-sm text-gray-500">{customer.email || "미입력"}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">성별</span>
                <span className="text-sm text-gray-500">
                  {customer.gender === "MALE" ? "남성" : customer.gender === "FEMALE" ? "여성" : "미입력"}
                </span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <span className="text-sm text-gray-700">나이</span>
                <span className="text-sm text-gray-500">{calculateAge(customer.birthDate)}</span>
              </div>

              <div className="py-4 border-b border-gray-50">
                <p className="text-sm text-gray-700 mb-2">관심 카테고리</p>
                {preferredCategories.length === 0 ? (
                  <p className="text-sm text-gray-400">아직 선택한 관심 카테고리가 없어요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredCategories.map((c) => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="py-4">
                <p className="text-sm text-gray-700 mb-2">관심 지역</p>
                {preferredRegions.length === 0 ? (
                  <p className="text-sm text-gray-400">아직 선택한 관심 지역이 없어요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredRegions.map((r) => (
                      <span key={r} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/mypage/edit"
                className="block w-full text-center border border-gray-300 rounded-full py-3 text-sm font-medium mt-6"
              >
                수정하기
              </Link>

              <button
                type="button"
                onClick={() => alert("준비 중이에요.")}
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
                {[...wishlistIds].map((popupId) => {
                  const p = wishlistPopups[popupId];
                  return (
                    <Link
                      key={popupId}
                      href={`/popup/${popupId}`}
                      className="flex items-center gap-4 border border-gray-200 rounded-xl p-4"
                    >
                      <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        이미지
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p?.title ?? `팝업 #${popupId}`}</p>
                        {p?.location && <p className="text-xs text-gray-400 mt-0.5">{p.location}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(popupId);
                        }}
                        aria-label="찜 해제"
                        className="text-gray-300 flex-none"
                      >
                        ✕
                      </button>
                    </Link>
                  );
                })}
              </div>
            ))}

          {activeMenu === "예약 / 웨이팅" && (
            <div className="flex flex-col gap-10">
              <section>
                <h2 className="text-sm font-semibold mb-3">웨이팅</h2>
                {myWaitings.length === 0 ? (
                  <EmptyState message="진행 중인 웨이팅이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {myWaitings.map((w) => (
                      <Link
                        key={w.id}
                        href={`/waiting/${w.id}`}
                        className="block border border-gray-200 rounded-xl p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            이미지
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1">
                              {reservationPopupTitles[w.popupId] ?? `팝업 #${w.popupId}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              앞 {w.teamsAhead}팀 · {w.partySize}명 · {w.status}
                            </p>
                          </div>
                          <div className="text-right flex-none">
                            <span className="text-2xl font-bold">{w.teamNumber}</span>
                            <span className="text-xs text-gray-500 ml-0.5">번째</span>
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
                  <p className="text-sm text-gray-400 py-10 text-center">불러오는 중...</p>
                ) : myReservations.length === 0 ? (
                  <EmptyState message="예약 내역이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {myReservations.map((r) => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className="flex items-center gap-4 border border-gray-200 rounded-xl p-5"
                      >
                        <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          이미지
                        </div>
                        <div>
                          <span className="inline-block text-xs text-gray-500 mb-1">{r.status}</span>
                          <p className="text-sm font-semibold mb-1">
                            {reservationPopupTitles[r.popupId] ?? `팝업 #${r.popupId}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.reservationDate ?? "시간대 예약"} · {r.partySize}명
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeMenu === "쿠폰함" && <EmptyState message="보유한 쿠폰이 없어요." />}
          {activeMenu === "다녀간 팝업" &&
            (myReviews === null || myReservations === null ? (
              <p className="text-sm text-gray-400 py-16 text-center">불러오는 중...</p>
            ) : visitedItems.length === 0 ? (
              <EmptyState message="다녀간 팝업이 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {visitedItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={`/popup/${item.popupId}`}
                    className="block border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                          {item.type === "review" ? "후기" : item.type === "reservation" ? "예약" : "웨이팅"}
                        </span>
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-none ml-2">{toDisplayDate(item.date)}</span>
                    </div>
                    {item.type === "review" && (
                      <>
                        <p className="text-xs text-gray-500 mb-1">⭐ {item.rating}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                      </>
                    )}
                    {item.type !== "review" && (
                      <p className="text-sm text-gray-600">방문 완료 · 아직 후기를 남기지 않았어요</p>
                    )}
                  </Link>
                ))}
              </div>
            ))}

          {activeMenu === "알림 설정" && (
            <div className="flex flex-col gap-1">
              {notifSettings.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleNotif(item.id)}
                    aria-pressed={item.enabled}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      item.enabled ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        item.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeMenu === "공지사항" && (
            <div className="flex flex-col">
              {notices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  className="block py-4 border-b border-gray-50"
                >
                  <p className="text-sm text-gray-800">{notice.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{notice.date}</p>
                </Link>
              ))}
            </div>
          )}

          {activeMenu === "약관" && (
            <div>
              {termsError ? (
                <p className="text-sm text-gray-400 py-10 text-center">약관을 불러오지 못했어요.</p>
              ) : !terms ? (
                <p className="text-sm text-gray-400 py-10 text-center">불러오는 중...</p>
              ) : (
                <div>
                  <p className="text-base font-semibold mb-1">{terms.title}</p>
                  <p className="text-xs text-gray-400 mb-4">
                    최종 수정일 {new Date(terms.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {terms.content}
                  </p>
                </div>
              )}
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
                      className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
                    />
                    <textarea
                      value={csContent}
                      onChange={(e) => setCsContent(e.target.value)}
                      placeholder="문의 내용을 입력해 주세요."
                      rows={5}
                      className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitCsRequest}
                    disabled={csSubmitting || !csTitle.trim() || !csContent.trim()}
                    className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-50"
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
                        <div key={cs.id} className="border border-gray-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">{cs.title}</p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                cs.status === "ANSWERED" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {cs.status === "ANSWERED" ? "답변완료" : "답변대기"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{cs.content}</p>
                          {cs.answerContent && (
                            <div className="bg-gray-50 rounded-lg px-3 py-2 mt-2">
                              <p className="text-xs text-gray-400 mb-1">답변</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{cs.answerContent}</p>
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
                <div key={faq.q} className="border-b border-gray-50">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between py-4 text-left"
                  >
                    <span className="text-sm text-gray-800">{faq.q}</span>
                    <span className="text-xs text-gray-400">{openFaq === index ? "−" : "+"}</span>
                  </button>
                  {openFaq === index && <p className="text-sm text-gray-500 pb-4">{faq.a}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="bg-white rounded-xl px-6 py-6 w-full max-w-xs">
            <p className="text-sm font-medium text-center mb-6">로그아웃 하시겠어요?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}