// components/home/RankingSection.tsx
import Image from "next/image";

interface Popup {
  id: string;
  name: string;
  imageUrl?: string;
}

interface RankingSectionProps {
  title: string;
  items: Popup[];
}

export function RankingSection({ title, items }: RankingSectionProps) {
  return (
    <section className="px-4 py-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto">
        {items.map((popup, index) => (
          <div key={popup.id} className="relative flex-shrink-0 w-24">
            <span className="absolute top-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="relative h-32 w-24 overflow-hidden rounded-lg bg-gray-100">
              {popup.imageUrl ? (
                <Image
                  src={popup.imageUrl}
                  alt={popup.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                  이미지
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}