import { RouterProvider } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { router } from "./routes";

// 관리자 전용 앱 — 플랫폼 방문자 집계(logVisit)는 일반 사용자용 지표이므로
// 주최자 앱(popupfrontend)에서만 전송하고 여기서는 보내지 않는다.
export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
