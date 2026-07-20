import { reviews } from "@/data/mockPopups";
import { ReviewCard } from "./ReviewCard";

export function ReviewSection() {
  return (
    <section className="mb-10 px-4">
      <h3 className="text-base font-semibold mb-3">실시간 후기 모음</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {reviews.map((r) => (
          <ReviewCard key={r.id} {...r} />
        ))}
      </div>
    </section>
  );
}