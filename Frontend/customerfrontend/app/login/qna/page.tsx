// app/login/qna/page.tsx
// Q&A 페이지
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";

const FAQS = [
  { q: "웨이팅은 어떻게 신청하나요?", a: "팝업 상세페이지의 '웨이팅' 버튼에서 카카오 로그인으로 바로 신청할 수 있어요." },
  { q: "예약 취소는 어디서 하나요?", a: "마이페이지 > 웨이팅 / 예약에서 취소할 예약을 선택해 취소할 수 있어요." },
];

export default function LoginQnaPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">Q&A</h1>
      </div>

      <div className="px-4 mobile:px-8 py-2">
        {FAQS.map((faq, index) => (
          <div key={faq.q} className="border-b border-gray-50 dark:border-[#282B32]">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
              className="w-full flex items-center justify-between py-4 text-left"
            >
              <span className="text-sm text-gray-800 dark:text-white">{faq.q}</span>
              <span className="text-sm text-gray-400">{openFaq === index ? "−" : "+"}</span>
            </button>
            {openFaq === index && (
              <p className="text-sm text-gray-500 dark:text-gray-400 pb-4">{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
