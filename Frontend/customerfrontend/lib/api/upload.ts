// lib/api/upload.ts
//
// [신규 연결] 백엔드 FileUploadController(common/upload/FileUploadController.java)가
// POST /api/customer/files/upload (multipart/form-data)로 이미 존재하는데, 프론트 어디서도
// 호출하지 않고 있었어요. 그 결과 후기 작성 화면의 "사진 추가" 버튼이 실제 파일 선택 없이
// picsum.photos 랜덤 이미지 URL을 그냥 넣는 가짜 동작만 하고 있었습니다 (app/popup/[id]/review/page.tsx).
//
// apiFetch(client.ts)는 항상 Content-Type: application/json을 강제로 붙이기 때문에
// multipart/form-data 요청에는 못 써요(boundary가 깨짐) — 그래서 별도로 fetch를 직접 씁니다.

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
        // Content-Type은 일부러 안 넣어요 — FormData를 쓰면 브라우저가
        // multipart boundary를 포함해서 알아서 채워줘요. 직접 지정하면 오히려 깨져요.
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
