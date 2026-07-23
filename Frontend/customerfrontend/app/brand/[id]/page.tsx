"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { findBrandById } from "@/data/mockBrands";
import { getPopupsByBrand, type PopupItem } from "@/data/mockPopups";

const TABS = ["진행중인 팝업", "완료된 팝업"] as const;

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const brand = findBrandById(id);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("진행중인 팝업");

  if (!brand) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        브랜드 정보를 찾을 수 없어요.
      </main>
    );
  }

  const { ongoing, ended } = getPopupsByBrand(brand.id);
  const activeList = activeTab === "진행중인 팝업" ? ongoing : ended;

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="px-4 mobile:px-8 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500"
        >
          ‹ 뒤로
        </button>
      </div>

      <div className="px-4 mobile:px-8 py-6">
        {/* 브랜드 로고 */}
        <div className="w-24 h-24 rounded-md bg-gray-100 border border-gray-200 mb-4" />

        {/* 브랜드 이름 + 소개 + 찜 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">{brand.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{brand.tagline}</p>
          </div>
          <div className="flex flex-col items-center flex-none pt-1">
            <span className="text-xl leading-none">♡</span>
            <span className="text-sm text-gray-500 mt-1">{brand.likeCount}</span>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 mb-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-3 text-sm ${
                activeTab === tab
                  ? "font-semibold border-b-2 border-gray-900"
                  : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 팝업 목록 */}
        {activeList.length === 0 ? (
          <p className="text-sm text-gray-400 py-16 text-center">
            {activeTab === "진행중인 팝업" ? "진행중인 팝업이 없어요." : "완료된 팝업이 없어요."}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeList.map((item) => (
              <BrandPopupRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}

function BrandPopupRow({ item }: { item: PopupItem }) {
  return (
    <Link href={`/popup/${item.id}`} className="flex gap-4 py-4 border-b border-gray-50">
      <div className="w-20 h-20 flex-none rounded-md bg-gray-100 border border-gray-200" />
      <div className="flex flex-col justify-center">
        {item.status && <p className="text-xs text-gray-400 mb-1">{item.status === "예정" ? "진행예정" : item.status}</p>}
        <p className="text-base font-medium">{item.name}</p>
        {item.dateRange && <p className="text-sm text-gray-400 mt-1">{item.dateRange}</p>}
        {item.location && <p className="text-sm text-gray-400">{item.location}</p>}
      </div>
    </Link>
  );
}