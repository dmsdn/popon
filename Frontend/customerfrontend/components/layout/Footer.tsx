import Link from "next/link";

// [수정] "이용약관 | 개인정보처리방침 | ..." 부분이 그냥 텍스트라서 눌러도 아무 일도
// 안 일어났어요. 백엔드엔 약관이 문서 하나로만 있어서(4개로 나뉘어있지 않음) 넷 다
// 마이페이지의 "약관" 탭(실제 약관 본문을 보여주는 곳)으로 연결했습니다.
export function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 px-4 py-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
      <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">로고</p>
      <p className="mb-3 flex flex-wrap gap-x-1">
        <Link href="/mypage?menu=약관#terms-service" className="underline underline-offset-2">
          이용약관
        </Link>
        <span>|</span>
        <Link href="/mypage?menu=약관#terms-privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        <span>|</span>
        <Link href="/mypage?menu=약관#terms-location" className="underline underline-offset-2">
          위치정보 이용약관
        </Link>
        <span>|</span>
        <Link href="/mypage?menu=약관" className="underline underline-offset-2">
          이메일무단수집거부
        </Link>
      </p>
      <p className="font-medium text-gray-700 dark:text-gray-300">애지중지</p>
      <p>서울특별시 강남구 테헤란로 5길 20, 3층</p>
      <p>대표 이메일 | 기타 연락처</p>
      <p className="mt-3">Copyright © 애지중지 All rights Reserved.</p>
    </footer>
  );
}