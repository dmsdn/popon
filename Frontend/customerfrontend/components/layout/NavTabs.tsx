const tabs = ["홈", "찾기", "지도 탐색", "찜", "브랜드"];

export function NavTabs() {
  return (
    <nav className="flex justify-center gap-8 bg-gray-100 py-3">
      {tabs.map((tab, i) => (
        <span
          key={tab}
          className={i === 0 ? "font-semibold" : "text-gray-500"}
        >
          {tab}
        </span>
      ))}
    </nav>
  );
}