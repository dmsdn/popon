// lib/api/announcements.ts
// 공지사항

// [신규 연결] 관리자가 등록·관리하는 공지사항 API(GET /api/announcements)를 연결해 실제 공지사항 데이터를 불러옴

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
