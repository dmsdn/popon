// components/layout/BottomTabBar.tsx
import Image from "next/image";

const tabs = [
  { icon: "/icon/Bar_Home.svg", label: "홈" },
  { icon: "/icon/Bar_Search.svg", label: "검색" },
  { icon: "/icon/Bar_Cart.svg", label: "장바구니" },
  { icon: "/icon/Bar_User.svg", label: "마이" },
  { icon: "/icon/Bar_Other.svg", label: "기타" },
];

export function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white py-2">
      {tabs.map(({ icon: Icon, label }) => (
        <button
          key={label}
          aria-label={label}
          className="flex flex-col items-center gap-1 p-2"
        >
          <Image src={Icon} alt={label} width={24} height={24} />
        </button>
      ))}
    </nav>
  );
}