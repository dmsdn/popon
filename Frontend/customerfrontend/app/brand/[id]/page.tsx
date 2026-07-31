"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { findBrandById, type Brand } from "@/data/mockBrands";
import { getPopupsByBrand, type PopupItem } from "@/data/mockPopups";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const TABS = ["진행중인 팝업", "완료된 팝업"] as const;

// [수정] 이전엔 이 페이지가 항상 로컬 mock 브랜드 데이터(data/mockBrands.ts)만 봤어요.
// 그런데 실제 팝업 상세페이지의 businessId는 진짜 백엔드 숫자 id라서 서로 안 맞았고,
// 애초에 이 페이지로 연결되는 링크 자체가 앱 어디에도 없었어요(팝업 상세의 업체명이
// 그냥 텍스트였음). 업체 프로필을 따로 조회하는 API는 아직 백엔드에 없지만, 팝업 목록
// API(searchPopups)는 실제 데이터라 businessId로 필터링하면 "이 업체의 팝업 목록"은
// 진짜 데이터로 보여줄 수 있어요. 그래서 실 데이터를 먼저 시도하고, 못 찾으면(숫자가
// 아니거나 매칭되는 팝업이 없으면) 기존 mock 브랜드로 대체합니다.
export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("진행중인 팝업");

  const [loading, setLoading] = useState(true);
  const [realOngoing, setRealOngoing] = useState<PopupItem[]>([]);
  const [realEnded, setRealEnded] = useState<PopupItem[]>([]);
  const [realCompanyName, setRealCompanyName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    searchPopups()
      .then((list) => {
        if (cancelled) return;
        const mine = list.filter((p) => String(p.businessId) === id);
        if (mine.length > 0) {
          setRealCompanyName(mine[0].companyName);
          setRealOngoing(mine.filter((p) => p.status === "OPEN" || p.status === "BEFOR").map(toPopupItem));
          setRealEnded(mine.filter((p) => p.status === "CLOSED").map(toPopupItem));
        }
      })
      .catch((err) => console.error("브랜드 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className="px-6 py-20 text-center text-gray-400">불러오는 중이에요...</main>;
  }

  const hasRealData = realCompanyName !== null;
  const mockBrand: Brand | undefined = hasRealData ? undefined : findBrandById(id);

  if (!hasRealData && !mockBrand) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        브랜드 정보를 찾을 수 없어요.
      </main>
    );
  }

  const { ongoing, ended } = hasRealData
    ? { ongoing: realOngoing, ended: realEnded }
    : getPopupsByBrand(mockBrand!.id);
  const activeList = activeTab === "진행중인 팝업" ? ongoing : ended;
  const displayName = hasRealData ? realCompanyName! : mockBrand!.name;

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex-1">
      <div className="px-4 mobile:px-8 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500"
        >
          <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
        </button>
      </div>

      <div className="px-4 mobile:px-8 py-6">
        {/* 브랜드 로고 */}
        <div className="w-24 h-24 rounded-md bg-gray-100 dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] mb-4" />

        {/* 브랜드 이름 + 소개 + 찜 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            {/* 소개/찜 수는 실제 업체 프로필 API가 아직 없어서 mock 브랜드일 때만 표시돼요 */}
            {mockBrand && <p className="text-sm text-gray-500 mt-1">{mockBrand.tagline}</p>}
          </div>
          {mockBrand && (
            <div className="flex flex-col items-center flex-none pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Icon/heart_N.svg" alt="" width={20} height={20} />
              <span className="text-sm text-gray-500 mt-1">{mockBrand.likeCount}</span>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 dark:border-[#282B32] mb-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-3 text-sm ${
                activeTab === tab
                  ? "font-semibold border-b-2 border-gray-900 dark:border-white"
                  : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 팝업 목록 */}
        {activeList.length === 0 ? (
          <EmptyState
            message={activeTab === "진행중인 팝업" ? "진행중인 팝업이 없어요." : "완료된 팝업이 없어요."}
          />
        ) : (
          <div className="flex flex-col">
            {activeList.map((item) => (
              <BrandPopupRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

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
    <Link href={`/popup/${item.id}`} className="flex gap-4 py-4 border-b border-gray-50 dark:border-[#282B32]">
      <div className="w-24 h-24 flex-none rounded-md bg-gray-100 dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] overflow-hidden flex items-center justify-center text-sm text-gray-400">
        {item.imageUrl ? <ImageWithFallback src={item.imageUrl} className="w-full h-full object-cover" /> : "이미지"}
      </div>
      <div className="flex flex-col justify-center">
        {item.status && <p className="text-sm text-gray-400 mb-1">{item.status === "예정" ? "진행예정" : item.status}</p>}
        <p className="text-base font-medium">{item.name}</p>
        {item.dateRange && <p className="text-sm text-gray-400 mt-1">{item.dateRange}</p>}
        {item.location && <p className="text-sm text-gray-400">{item.location}</p>}
      </div>
    </Link>
  );
}
