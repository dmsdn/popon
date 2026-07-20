export function NoticeBar() {
  return (
    <div className="mx-4 my-6 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 text-sm">
      <span>
        <span className="font-medium">[공지]</span> 공지사항
      </span>
      <span className="text-gray-400 text-xs">보러가기</span>
    </div>
  );
}