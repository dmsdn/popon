import { ReviewItem } from "@/data/mockPopups";

export function ReviewCard({ popupName, content, date, rating }: ReviewItem) {
  return (
    <div className="flex-none w-[200px] flex flex-col gap-2">
      {/* 이미지: 4~8px 라운드, 카드 테두리 없이 독립 */}
      <div className="h-[90px] rounded-md bg-gray-100 flex items-end p-3 text-sm text-gray-500 overflow-hidden">
        후기내용 + 이미지
      </div>

      {/* 정보: 이미지와 분리해서 아래에 별도로 모음 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-900">{popupName}</p>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{date}</span>
          <span>⭐ {rating}</span>
        </div>
      </div>
    </div>
  );
}
