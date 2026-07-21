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
import PopupRegister from "./seller/pages/PopupRegister";
import Reservations from "./seller/pages/Reservations";
import WaitingControl from "./seller/pages/WaitingControl";
import Products from "./seller/pages/Products";
import Quotes from "./seller/pages/Quotes";
import Performance from "./seller/pages/Performance";
import Notices from "./seller/pages/Notices";
import Inquiries from "./seller/pages/Inquiries";
import CustomerInquiries from "./seller/pages/CustomerInquiries";

// ── 현장 웨이팅 비회원 접수 (QR 진입 공개 페이지) ──
import WalkinPage from "./walkin/WalkinPage";

// ── 플랫폼 관리자 UI ──
import AdminRoot from "./admin/AdminRoot";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminPopups from "./admin/pages/AdminPopups";
import AdminPopupEdit from "./admin/pages/AdminPopupEdit";
import Accounts from "./admin/pages/Accounts";
import Businesses from "./admin/pages/Businesses";
import Members from "./admin/pages/Members";
import Masters from "./admin/pages/Masters";
import PlatformStats from "./admin/pages/PlatformStats";
import ContentManage from "./admin/pages/ContentManage";
import CS from "./admin/pages/CS";

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
      { path: "reservations", Component: Reservations },
      { path: "waiting", Component: WaitingControl },
      { path: "products", Component: Products },
      { path: "quotes", Component: Quotes },
      { path: "performance", Component: Performance },
      { path: "notices", Component: Notices },
      { path: "inquiries", Component: Inquiries },
      { path: "customer-inquiries", Component: CustomerInquiries },
    ],
  },

  // 2.5) 비회원 현장 웨이팅 폼 — 로그인 불필요, 현장 QR로 진입
  { path: "/walkin", Component: WalkinPage },

  // 3) 플랫폼 관리자 (최상위 루트: /admin)
  {
    path: "/admin",
    Component: AdminRoot,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "login", Component: AdminLogin },
      { path: "popups", Component: AdminPopups },
      { path: "popups/edit", Component: AdminPopupEdit },
      { path: "accounts", Component: Accounts },
      { path: "businesses", Component: Businesses },
      { path: "members", Component: Members },
      { path: "masters", Component: Masters },
      { path: "stats", Component: PlatformStats },
      { path: "content", Component: ContentManage },
      { path: "cs", Component: CS },
    ],
  },
]);
