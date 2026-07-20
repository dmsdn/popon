"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ReviewCard } from "@/components/popup/ReviewCard";
import { PlaceCard } from "@/components/popup/PlaceCard";
import {
  recentPopups,
  popularPopups,
  openingSoonPopups,
  freePopups,
  reviews,
  type PopupItem,
} from "@/data/mockPopups";

const TABS = ["정보", "굿즈", "후기"] as const;

// ⚠️ 지금 mockPopups.ts의 각 배열(recentPopups, popularPopups...)이
//    id를 "1"부터 각자 따로 매기고 있어서, 이 함수는 배열들을 순서대로 뒤져
//    가장 먼저 걸리는 항목을 반환해요. 즉 여러 배열에 같은 id="1"이 있으면
//    항상 recentPopups 쪽이 먼저 잡힙니다.
//    실제로 쓰려면 전체 팝업에서 id가 겹치지 않게(예: p001, p002...) 만들어야 해요.
function findPopupById(id: string): PopupItem | undefined {
  const all = [...recentPopups, ...popularPopups, ...openingSoonPopups, ...freePopups];
  return all.find((item) => item.id === id);
}

export default function PopupDetailPage({ params }: { params: { id: string } }) {
  const popup = findPopupById(params.id);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("정보");

  if (!popup) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        팝업 정보를 찾을 수 없어요.
      </main>
    );
  }

  // ⚠️ 아래 값들(태그, 평점, 공지, 소개, 이용정보 등)은 PopupItem 타입에 없는
  //    필드라서 지금은 화면 구조만 맞춘 임시 값이에요. 실제 데이터가 준비되면
  //    PopupItem을 확장하거나 별도 상세 데이터 소스를 연결해주세요.
  const relatedReviews = reviews.filter((r) => r.popupName === popup.name);

  return (
    <main className="mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <MobileHeader />
      </div>

      <div className="px-4 mobile:px-8 py-6">
        {/* 대표 이미지 */}
        <div className="aspect-[4/5] max-h-[520px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm mb-5">
          대표 이미지
        </div>

        {/* 브랜드 브레드크럼 */}
        <p className="text-xs text-gray-400 mb-2">{popup.location ?? "브랜드"} &gt;</p>

        {/* 제목 + 평점 */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold">{popup.name}</h1>
          {/* TODO: 실제 평점 데이터 연결 */}
          <span className="text-sm text-gray-500 flex-none">★★★★★ 4/5</span>
        </div>

        {popup.dateRange && <p className="text-sm text-gray-500">{popup.dateRange}</p>}
        {popup.location && <p className="text-sm text-gray-500 mb-3">{popup.location}</p>}

        {/* 태그 - TODO: 실제 카테고리/지역 태그 데이터 연결 */}
        <div className="flex gap-2 mb-6">
          {[popup.location].filter(Boolean).map((tag) => (
            <span key={tag} className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600">
              {tag}
            </span>
          ))}
        </div>

        {/* 사전 예약 / 웨이팅 박스 */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold mb-1">사전 예약</p>
            <p className="text-xs text-gray-400">
              [Event] 사전 예약 시 소정의 상품을 증정해드립니다 &gt;
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold mb-1">웨이팅</p>
            <p className="text-xs text-gray-400">
              [Event] 사전 예약 시 소정의 상품을 증정해드립니다 &gt;
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 mb-6">
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
              {tab === "후기" ? `후기 (${relatedReviews.length})` : tab}
            </button>
          ))}
        </div>

        {activeTab === "정보" && (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="text-sm font-semibold mb-2">공지사항</h2>
              {/* TODO: 실제 공지 데이터 연결 */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                운영 시작 시간은 현장 상황에 따라 변경될 수 있습니다.
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">혜택</h2>
              {/* TODO: 실제 혜택 데이터 연결 */}
              <p className="text-sm text-gray-400">등록된 혜택이 없어요.</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">소개</h2>
              {/* TODO: 실제 소개 데이터 연결 */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {popup.name}에서 준비한 특별한 팝업스토어예요. 신제품 체험부터 다양한 이벤트, 한정
                굿즈까지 이곳에서만 만나볼 수 있는 특별한 경험을 준비했습니다.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">이용 정보</h2>
              {/* TODO: 실제 이용 정보 데이터 연결 */}
              <p className="text-sm text-gray-600">주차 가능 / 무료 입장 / 사전 예약</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">SNS / 홈페이지</h2>
              {/* TODO: 실제 SNS/홈페이지 링크 연결 */}
              <div className="bg-gray-900 rounded-xl h-[180px] flex items-center justify-center text-white text-sm">
                WELCOME 이미지 영역
              </div>
              <button type="button" className="w-full text-center text-sm text-gray-500 mt-3 py-2">
                모두 보기 ⌄
              </button>
            </section>
          </div>
        )}

        {activeTab === "굿즈" && (
          <p className="text-sm text-gray-400 py-10 text-center">등록된 굿즈가 없어요.</p>
        )}

        {activeTab === "후기" && (
          <section>
            {relatedReviews.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">아직 후기가 없어요.</p>
            ) : (
              relatedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </section>
        )}
      </div>

      {/* 팝업 주변 핫플 - TODO: 실제 주변 장소 데이터 연결 */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">팝업 주변 핫플</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <PlaceCard category="카페" name="프롤라" distance="114m" />
          <PlaceCard category="패션잡화" name="뉴뉴 성수점" distance="89m" />
          <PlaceCard category="카페" name="대림창고갤러리" distance="407m" />
          <PlaceCard category="음식점" name="옥수동 화덕피자 성수" distance="240m" />
        </div>
      </section>

      {/* 비슷한 팝업 - TODO: 실제 추천 로직 연결 */}
      <section className="px-4 mobile:px-8 mb-10">
        <h2 className="text-base font-semibold mb-3">비슷한 팝업</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[...recentPopups, ...popularPopups]
            .filter((item) => item.id !== popup.id || item.name !== popup.name)
            .slice(0, 4)
            .map((item) => (
              <PlaceCard key={item.id + item.name} category={item.location ?? "팝업"} name={item.name} />
            ))}
        </div>
      </section>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}