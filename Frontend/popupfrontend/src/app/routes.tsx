import { createBrowserRouter } from "react-router";

// ── 주최자 정보제공 UI (팝업온 소개 사이트) ──
import InfoRoot from "./info/InfoRoot";
import Home from "./info/pages/Home";
import ContentRegister from "./info/pages/ContentRegister";
import WaitingManagement from "./info/pages/WaitingManagement";
import Login from "./info/pages/Login";

// ── 주최자 팝업등록 콘솔 (판매자센터, 쿠팡 윙 스타일) ──
import SellerRoot from "./seller/SellerRoot";
import SellerDashboard from "./seller/pages/SellerDashboard";
import PopupList from "./seller/pages/PopupList";
import PopupDetail from "./seller/pages/PopupDetail";
import PopupRegister from "./seller/pages/PopupRegister";
import Reservations from "./seller/pages/Reservations";
import WaitingControl from "./seller/pages/WaitingControl";
import Performance from "./seller/pages/Performance";
import Notices from "./seller/pages/Notices";
import MyPage from "./seller/pages/MyPage";
import Inquiries from "./seller/pages/Inquiries";
import CustomerInquiries from "./seller/pages/CustomerInquiries";

// ── 현장 웨이팅 비회원 접수 (QR 진입 공개 페이지) ──
import WalkinPage from "./walkin/WalkinPage";

// ※ 플랫폼 관리자 UI는 별도 앱(Frontend/adminfrontend · 5175)으로 분리됨.
//   origin이 갈라지면서 관리자·주최자 토큰이 localStorage에서 충돌하던 문제도 함께 해소.

export const router = createBrowserRouter([
  // 1) 주최자 정보제공 (최상위 루트: 서비스 소개·등록 안내·정보센터)
  {
    path: "/",
    Component: InfoRoot,
    children: [
      { index: true, Component: Home },
      { path: "content-register", Component: ContentRegister },
      { path: "waiting-management", Component: WaitingManagement },
      { path: "login", Component: Login },
    ],
  },

  // 2) 주최자 팝업등록 콘솔 (최상위 루트: /seller)
  {
    path: "/seller",
    Component: SellerRoot,
    children: [
      { index: true, Component: SellerDashboard },
      { path: "popups", Component: PopupList },
      { path: "popups/new", Component: PopupRegister },
      // 상세페이지 — 조회 표에서 제목 클릭 시 진입, 삭제는 여기서만 (7/24 멘토 피드백)
      { path: "popups/:id", Component: PopupDetail },
      { path: "reservations", Component: Reservations },
      { path: "waiting", Component: WaitingControl },
      // 파트너공간(venues)·견적진행단계(quotes) 메뉴는 7/24 멘토 피드백으로 삭제됨
      // 상품/재고 관리(products)는 7/29 기능 탈락 확정으로 삭제됨
      { path: "performance", Component: Performance },
      { path: "notices", Component: Notices },
      // 마이페이지 — 상단바 계정 영역에서 진입 (7/25 피드백)
      { path: "mypage", Component: MyPage },
      { path: "inquiries", Component: Inquiries },
      { path: "customer-inquiries", Component: CustomerInquiries },
    ],
  },

  // 2.5) 비회원 현장 웨이팅 폼 — 로그인 불필요, 현장 QR로 진입
  { path: "/walkin", Component: WalkinPage },
]);
