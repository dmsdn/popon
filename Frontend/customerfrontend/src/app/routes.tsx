import { createBrowserRouter } from "react-router";
import Root from "./Root";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import PopupDetail from "./pages/PopupDetail";
import Reserve from "./pages/Reserve";
import Reservations from "./pages/Reservations";
import Waiting from "./pages/Waiting";
import ReviewWrite from "./pages/ReviewWrite";
import Notifications from "./pages/Notifications";
import Events from "./pages/Events";
import Brand from "./pages/Brand";
import MyPage from "./pages/MyPage";
import Login from "./pages/Login";
import Support from "./pages/Support";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },                      // 메인: 검색·추천·프로모션·인기
      { path: "explore", Component: Explore },               // 탐색: 지도·필터·맞춤 추천
      { path: "popup/:id", Component: PopupDetail },         // 팝업 상세
      { path: "popup/:id/reserve", Component: Reserve },     // 예약: 날짜/시간/인원/약관
      { path: "popup/:id/review", Component: ReviewWrite },  // 리뷰 작성
      { path: "reservations", Component: Reservations },     // 예약 관리
      { path: "waiting", Component: Waiting },               // 웨이팅(원격 줄서기)
      { path: "notifications", Component: Notifications },   // 알림
      { path: "events", Component: Events },                 // 프로모션/이벤트
      { path: "brand/:id", Component: Brand },               // 브랜드 페이지
      { path: "my", Component: MyPage },                     // 마이페이지·설정
      { path: "login", Component: Login },                   // 소셜 로그인·가입 설문
      { path: "support", Component: Support },               // 문의하기·FAQ
    ],
  },
]);
