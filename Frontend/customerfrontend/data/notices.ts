export interface Notice {
  id: string;
  title: string;
  date: string; // "YY.MM.DD" 형식 (문자열 정렬로도 최신순 비교 가능)
  content: string;
}

// TODO: 실제 서비스에서는 백엔드 공지사항 API로 교체해주세요.
export const notices: Notice[] = [
  {
    id: "1",
    title: "여름맞이 팝업 이벤트 안내",
    date: "26.07.15",
    content:
      "무더운 여름, 시원한 이벤트로 찾아왔어요! 참여 팝업에서 사전 예약 시 굿즈를 증정해드려요. 자세한 내용은 각 팝업 상세페이지를 참고해주세요.",
  },
  {
    id: "2",
    title: "앱 이용약관 개정 안내",
    date: "26.06.30",
    content:
      "서비스 이용약관 및 개인정보처리방침 일부 조항이 개정되었어요. 변경된 약관은 2026년 7월 1일부터 적용되며, 자세한 내용은 고객센터로 문의해주세요.",
  },
  {
    id: "3",
    title: "웨이팅 서비스 점검 안내",
    date: "26.06.10",
    content:
      "보다 안정적인 서비스 제공을 위해 웨이팅 기능 점검을 진행해요. 점검 시간 동안에는 웨이팅 신청이 일시적으로 제한될 수 있어요.",
  },
];

/** 가장 최신 공지 하나를 반환합니다. (date 기준 내림차순) */
export function getLatestNotice(): Notice | undefined {
  return [...notices].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}
