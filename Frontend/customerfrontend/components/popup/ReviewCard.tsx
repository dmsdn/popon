import { ReviewItem } from "@/data/mockPopups";

/**
 * 후기 카드
 * ⚠️ 현재 ReviewItem 타입에는 작성자/좋아요 수 필드가 없어서
 *    해당 부분은 임시 표시값입니다. 실제 데이터 연동 시
 *    ReviewItem에 author, likeCount, isReservationVerified 같은
 *    필드를 추가해서 props로 받으면 됩니다.
 */
export function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="border-t border-gray-100 py-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <span className="text-sm font-medium">아이디</span>
        <span className="text-xs text-gray-400">{review.date}</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">예약</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{review.content}</p>
      <button type="button" className="text-xs text-gray-400 mt-2">
        도움돼요 33
      </button>
    </div>
  );
}