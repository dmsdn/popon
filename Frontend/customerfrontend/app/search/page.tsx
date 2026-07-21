// app/search/page.tsx
import Link from "next/link";
import { SearchInput } from "@/components/search/SearchInput";
import { RecentSearches } from "@/components/search/RecentSearches";
import { SuggestedKeywords } from "@/components/search/SuggestedKeywords";
import { RankingSection } from "@/components/home/RankingSection";
import { popularPopups } from "@/data/mockPopups";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q;

  return (
    <main>
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <SearchInput autoFocus />
      </header>

      {query ? (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-600">&quot;{query}&quot; 검색 결과</p>
          {/* TODO: 실제 검색 결과 리스트는 백엔드 연동 후 추가 */}
        </div>
      ) : (
        <>
          <RecentSearches />
          <SuggestedKeywords />
          <RankingSection title="실시간 인기 추천 팝업" items={popularPopups} />
        </>
      )}
    </main>
  );
}