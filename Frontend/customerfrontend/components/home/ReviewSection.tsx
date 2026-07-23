import { reviews } from "@/data/mockPopups";
import { ReviewCard } from "./ReviewCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";

export function ReviewSection() {
  return (
    <section className="mb-10 mobile:mb-14 px-4 mobile:px-8">
      <h3 className="text-base mobile:text-lg font-semibold mb-3 mobile:mb-4">실시간 후기 모음</h3>
      <HorizontalCarousel>
        {reviews.map((r) => (
          <ReviewCard key={r.id} {...r} />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
