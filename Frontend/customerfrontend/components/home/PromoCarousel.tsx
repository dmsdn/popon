"use client";
import { useState } from "react";
import { promoCards } from "@/data/mockPopups";

export function PromoCarousel() {
  const [active, setActive] = useState(1);

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6">
      <div className="flex gap-3 mobile:gap-5 overflow-x-auto snap-x snap-mandatory">
        {promoCards.map((card, i) => (
          <div
            key={card.id}
            className="flex-none w-[70%] mobile:w-[420px] snap-center h-[220px] mobile:h-[320px] border border-gray-200 rounded-xl mobile:rounded-2xl flex items-end justify-center pb-6 mobile:pb-8 bg-gray-50"
          >
            <span className="text-sm mobile:text-base text-gray-500">{card.title}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1 mobile:gap-1.5 mt-3 mobile:mt-4">
        {promoCards.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 mobile:w-2 mobile:h-2 rounded-full ${
              i === active ? "bg-gray-700" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}