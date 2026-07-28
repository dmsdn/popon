// lib/api/announcements.ts
//
// [신규 연결] 관리자가 관리하는 실제 공지사항 API(GET /api/announcements, 공개)가
// 있는데 프론트는 계속 data/notices.ts 목업만 쓰고 있었어요.

import { apiFetch } from "./client";

export interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string; // ISO datetime
}

export function getAnnouncements() {
  return apiFetch<Announcement[]>("/api/announcements");
}
