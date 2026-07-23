"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { notices } from "@/data/notices";
import { getMyReviews, toDisplayDate, type Review } from "@/lib/api/reviews";
import { getPopup, type PopupDetail } from "@/lib/api/popups";
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
  | "Q&A";

const SIDEBAR_MENU: MenuKey[] = [
  "찜 목록",
  "예약 / 웨이팅",
  "쿠폰함",
  "다녀간 팝업",
  "알림 설정",
  "공지사항",
  "1:1 문의",
  "Q&A",
];

const PROVIDER_LABEL = {
  KAKAO: "카카오 연결",
  GOOGLE: "구글 연결",
  DEV: "개발용 로그인",
} as const;

// ==================== 예시용 mock 데이터 (실제로는 백엔드 API로 대체) ====================
// TODO: getMyWaiting() API로 교체 - 웨이팅이 없으면 null을 내려줘야 프로필 카드가 자동으로 숨겨짐
const mockWaiting = {
  id: "w1",
  popupId: "1",
  popupName: "팝업 이름",
  aheadCount: 7,
  estimatedMinutes: 10,
  myOrder: 7,
};

// TODO: getMyReservations() API로 교체
// 예시로 2건을 넣어서, 아래 "바로가기 카드" 로직이 여러 건일 때 어떻게 동작하는지 확인할 수 있게 했어요.
const mockReservations = [
  { id: "r1", popupName: "팝업 이름", dDay: "D-1", date: "26. 07. 16. (목)", time: "오후 13:30", partySize: 2 },
  { id: "r2", popupName: "다른 팝업 이름", dDay: "D-3", date: "26. 07. 18. (토)", time: "오후 15:00", partySize: 1 },
];
// ================================================================================

const FAQS = [
  { q: "웨이팅은 어떻게 신청하나요?", a: "팝업 상세페이지의 '웨이팅' 버튼에서 카카오 로그인으로 바로 신청할 수 있어요." },
  { q: "예약 취소는 어디서 하나요?", a: "마이페이지 > 예약 / 웨이팅에서 취소할 예약을 선택해 취소할 수 있어요." },
  { q: "쿠폰은 어떻게 받나요?", a: "일부 팝업은 사전 예약/방문 인증 시 쿠폰함에 자동으로 지급돼요." },
];

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

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  // /mypage?menu=공지사항 처럼 쿼리로 들어오면 해당 메뉴가 바로 선택된 상태로 열립니다.
  const queryMenu = searchParams.get("menu");
const [syncedQueryMenu, setSyncedQueryMenu] = useState(queryMenu);

if (queryMenu !== syncedQueryMenu) {
  setSyncedQueryMenu(queryMenu);
  if (queryMenu && (VALID_MENUS as string[]).includes(queryMenu)) {
    setActiveMenu(queryMenu as MenuKey);
    setMobileView("detail");
  }
}

  if (loading || !customer) return null;

  const handleSelectMenu = (menu: MenuKey) => {
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
  const activeCount = (mockWaiting ? 1 : 0) + mockReservations.length;

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
                href={mockWaiting ? `/waiting/${mockWaiting.id}` : `/reservations/${mockReservations[0].id}`}
                className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
              >
                <span className="text-sm text-gray-700">
                  {mockWaiting ? `웨이팅 ${mockWaiting.myOrder}번째 대기중` : `예약 1건`}
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

          <nav className="flex flex-col">
            {SIDEBAR_MENU.map((menu) => (
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
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left px-4 mobile:px-6 py-3.5 text-sm text-gray-700"
            >
              로그아웃
            </button>
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

          {activeMenu === "내 정보" && (
            <div>
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
                <span className="text-sm text-gray-500">{customer.phone || "010 - 0000 - 0000"}</span>
              </div>

              <div className="py-4">
                <p className="text-sm text-gray-700 mb-3">관심 키워드</p>
                <p className="text-sm text-gray-400">아직 선택한 관심 키워드가 없어요.</p>
              </div>

              <button
                type="button"
                onClick={() => alert("준비 중이에요.")}
                className="w-full border border-gray-300 rounded-full py-3 text-sm font-medium mt-6"
              >
                수정하기
              </button>

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
                {mockWaiting ? (
                  <Link href={`/waiting/${mockWaiting.id}`} className="block border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        이미지
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">{mockWaiting.popupName}</p>
                        <p className="text-xs text-gray-500">
                          앞 {mockWaiting.aheadCount}팀 · 예상 대기 약 {mockWaiting.estimatedMinutes}분
                        </p>
                      </div>
                      <div className="text-right flex-none">
                        <span className="text-2xl font-bold">{mockWaiting.myOrder}</span>
                        <span className="text-xs text-gray-500 ml-0.5">번째</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <EmptyState message="진행 중인 웨이팅이 없어요." />
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold mb-3">예약</h2>
                {mockReservations.length === 0 ? (
                  <EmptyState message="예약 내역이 없어요." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {mockReservations.map((r) => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className="flex items-center gap-4 border border-gray-200 rounded-xl p-5"
                      >
                        <div className="w-16 h-16 flex-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          이미지
                        </div>
                        <div>
                          <span className="inline-block text-xs text-gray-500 mb-1">{r.dDay}</span>
                          <p className="text-sm font-semibold mb-1">{r.popupName}</p>
                          <p className="text-xs text-gray-500">{r.date} {r.time} {r.partySize}명</p>
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
            (myReviews === null ? (
              <p className="text-sm text-gray-400 py-16 text-center">불러오는 중...</p>
            ) : myReviews.length === 0 ? (
              <EmptyState message="다녀간 팝업이 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {myReviews.map((review) => (
                  <Link
                    key={review.id}
                    href={`/popup/${review.popupId}`}
                    className="block border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate">
                        {popupTitles[review.popupId] ?? `팝업 #${review.popupId}`}
                      </p>
                      <span className="text-xs text-gray-400 flex-none ml-2">
                        {toDisplayDate(review.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">⭐ {review.rating}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
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

          {activeMenu === "1:1 문의" && (
            <div>
              <p className="text-sm text-gray-500 mb-6">
                궁금하거나 불편한 점이 있으면 언제든 문의해 주세요. 영업일 기준 1~2일 내에 답변드려요.
              </p>
              <button
                type="button"
                onClick={() => alert("준비 중이에요.")}
                className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white"
              >
                문의하기
              </button>
              <p className="text-sm text-gray-400 mt-8">아직 문의한 내역이 없어요.</p>
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