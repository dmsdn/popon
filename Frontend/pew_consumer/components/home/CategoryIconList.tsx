import { categories } from "@/data/mockPopups";

export function CategoryIconList() {
  return (
    <div className="flex gap-5 mobile:gap-8 overflow-x-auto px-4 mobile:px-8 py-4 mobile:py-6">
      {categories.map((name, i) => (
        <div key={i} className="flex flex-col items-center gap-2 mobile:gap-3 flex-none">
          <div className="w-14 h-14 mobile:w-20 mobile:h-20 rounded-2xl bg-gray-100 border border-gray-200" />
          <span className="text-xs mobile:text-sm text-gray-600 whitespace-nowrap">{name}</span>
        </div>
      ))}
    </div>
  );
}