"use client";

import { use } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

export default function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-20">

      <div className="hidden mobile:block">
        <Header />
      </div>

      <div className="block mobile:hidden">
        <MobileHeader />
      </div>

      <div className="px-4 mobile:px-8 py-8">

        {/* 브랜드 정보 */}
        <div className="flex justify-between items-center mb-10">

          <div className="flex gap-6">

            <div className="w-28 h-28 rounded-3xl border border-gray-300 bg-gray-100" />

            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold mb-3">
                브랜드
              </h1>

              <p className="text-gray-500">
                브랜드 한 줄 소개
              </p>
            </div>

          </div>

          <div className="flex flex-col items-center">
            ♡
            <span className="text-sm mt-2">99</span>
          </div>

        </div>

        {/* 탭 */}

        <div className="grid grid-cols-2 border-b mb-8">

          <button className="py-4 border-b-2 border-black font-semibold">
            진행중인 팝업
          </button>

          <button className="py-4 text-gray-400">
            완료된 팝업
          </button>

        </div>

        {/* 팝업 카드 */}

        <div className="flex gap-5">

          <div className="w-32 h-40 rounded-2xl border border-gray-300 bg-gray-100" />

          <div className="flex flex-col justify-center">

            <span className="text-sm text-gray-400">
              진행예정
            </span>

            <h2 className="font-semibold text-xl mt-2">
              팝업 이름
            </h2>

            <p className="text-gray-500 mt-2">
              26.08.07 ~ 26.08.13
            </p>

            <p className="text-gray-500">
              위치
            </p>

          </div>

        </div>

      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>

    </main>
  );
}