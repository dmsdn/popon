import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { router } from "./routes";
import { logVisit } from "./lib/api";

export default function App() {
  // 플랫폼 방문자 집계 — 앱 최초 로드 시 1회만 전송 (백엔드가 하루 1건으로 중복제거)
  useEffect(() => {
    logVisit();
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
