// components/search/SuggestedKeywords.tsx
const suggested = ["더현대", "성수", "홍대"];

export function SuggestedKeywords() {
  return (
    <div className="px-4 py-3">
      <span className="text-sm font-medium text-gray-700 mb-2 block">추천 키워드</span>
      <div className="flex flex-wrap gap-2">
        {suggested.map((keyword) => (
          <span
            key={keyword}
            className="text-sm text-gray-600 border border-gray-200 rounded-full px-3 py-1.5"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}