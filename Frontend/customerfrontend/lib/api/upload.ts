// lib/api/upload.ts
// 파일을 백엔드에 업로드하고 업로드된 이미지 URL을 반환하는 API
//
// 후기 작성 등에서 사용자가 선택한 이미지를 서버에 저장할 때 사용
//
// FormData를 사용하는 multipart/form-data 요청이므로 일반 apiFetch 대신 별도의 fetch를 사용
// Content-Type은 브라우저가 multipart boundary와 함께 자동으로 설정
import { getToken, API_BASE } from "./client";
import { markBackendDown, markBackendUp } from "@/lib/backendStatus";

export interface UploadResult {
  url: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/customer/files/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch (networkError) {
    markBackendDown();
    throw networkError;
  }

  if (!res.ok) {
    if (res.status >= 500) markBackendDown();
    const message = await res.text().catch(() => "");
    throw new Error(message || `이미지 업로드에 실패했어요. (${res.status})`);
  }

  markBackendUp();
  return res.json();
}
