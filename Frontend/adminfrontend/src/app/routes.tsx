import { createBrowserRouter, Navigate } from "react-router";

// ── 플랫폼 관리자 UI (관리자 전용 앱 · 5175) ──
// 주최자 정보사이트·판매자센터·현장 웨이팅은 popupfrontend(5174)로 분리됨.
import AdminRoot from "./admin/AdminRoot";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminPopups from "./admin/pages/AdminPopups";
import AdminPopupEdit from "./admin/pages/AdminPopupEdit";
import AdminContracts from "./admin/pages/AdminContracts";
import Accounts from "./admin/pages/Accounts";
import Businesses from "./admin/pages/Businesses";
import Members from "./admin/pages/Members";
import Masters from "./admin/pages/Masters";
import PlatformStats from "./admin/pages/PlatformStats";
import ContentManage from "./admin/pages/ContentManage";
import CS from "./admin/pages/CS";

export const router = createBrowserRouter([
  // 루트 접속 시 관리자 대시보드로 — 이 앱에는 관리자 화면만 존재
  { path: "/", element: <Navigate to="/admin" replace /> },

  {
    path: "/admin",
    Component: AdminRoot,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "login", Component: AdminLogin },
      { path: "popups", Component: AdminPopups },
      { path: "popups/edit", Component: AdminPopupEdit },
      { path: "contracts", Component: AdminContracts },
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
