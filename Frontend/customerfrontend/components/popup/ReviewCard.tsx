import { ReviewItem } from "@/data/mockPopups";

export function ReviewCard({ review }: { review: ReviewItem }) {
  const { popupName, content, date, rating } = review;

  return (
    <div className="flex-none w-[200px] border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-3 h-[90px] flex items-end text-sm text-gray-500">
        {content}
      </div>
      <div className="flex justify-between px-3 text-xs text-gray-400 border-t border-gray-100 py-2">
        <span>{date}</span>
        <span>⭐ {rating}</span>
      </div>
      <div className="px-3 py-2 border-t border-gray-100 text-sm font-medium">
        {popupName}
      </div>
    </div>
  );
}