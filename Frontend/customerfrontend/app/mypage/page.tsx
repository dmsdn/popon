"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

type MenuKey =
  | "내 정보"
  | "찜 목록"
  | "예약 내역"
  | "쿠폰함"
  | "다녀간 팝업"
  | "알림 설정"
  | "공지사항"
  | "1:1 문의"
  | "Q&A";

const SIDEBAR_MENU: MenuKey[] = [
  "찜 목록",
  "예약 내역",
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
} as const;

const NOTICES = [
  { title: "여름맞이 팝업 이벤트 안내", date: "26.07.15" },
  { title: "앱 이용약관 개정 안내", date: "26.06.30" },
  { title: "웨이팅 서비스 점검 안내", date: "26.06.10" },
];

const FAQS = [
  { q: "웨이팅은 어떻게 신청하나요?", a: "팝업 상세페이지의 '웨이팅' 버튼에서 카카오 로그인으로 바로 신청할 수 있어요." },
  { q: "예약 취소는 어디서 하나요?", a: "마이페이지 > 예약 내역에서 취소할 예약을 선택해 취소할 수 있어요." },
  { q: "쿠폰은 어떻게 받나요?", a: "일부 팝업은 사전 예약/방문 인증 시 쿠폰함에 자동으로 지급돼요." },
];

export default function MyPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

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


  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div className="px-4 mobile:px-8 py-4 border-b border-gray-100">
        
        <h1 className="text-lg font-bold">
            <button
            type="button"
             onClick={() => router.back()}
            className="flex items-center gap-1 text-lg text-gray-500 mb-4"
          >
            ‹
          </button>
            내 정보
        </h1>
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
                <span className="flex items-center gap-1.5 text-xs font-medium bg-[#FEE500] rounded-full px-3 py-1.5">
                  💬 {PROVIDER_LABEL[customer.provider]}
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
                className="text-sm text-red-500 mt-8"
              >
                회원 탈퇴 ›
              </button>
            </div>
          )}

          {activeMenu === "찜 목록" && <EmptyState message="찜한 팝업이 없어요." />}
          {activeMenu === "예약 내역" && <EmptyState message="예약 내역이 없어요." />}
          {activeMenu === "쿠폰함" && <EmptyState message="보유한 쿠폰이 없어요." />}
          {activeMenu === "다녀간 팝업" && <EmptyState message="다녀간 팝업이 없어요." />}

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
              {NOTICES.map((notice) => (
                <div key={notice.title} className="py-4 border-b border-gray-50">
                  <p className="text-sm text-gray-800">{notice.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{notice.date}</p>
                </div>
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
                className="w-full rounded-full py-3.5 text-sm font-medium bg-[#FEE500]"
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