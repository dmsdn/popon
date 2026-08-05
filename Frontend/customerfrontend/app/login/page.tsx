"use client";

// 로그인 페이지 - 카카오/구글 소셜 로그인 버튼과 간편 가입 안내 말풍선.
// [수정 8/5] 화면 설정/공지사항/Q&A는 아코디언으로 이 화면 안에 다 우겨넣는
// 대신, 각각 독립된 화면(/login/settings, /notice, /login/qna)으로 분리하고
// 하단에 가로 텍스트 링크로만 뒀어요. 뒤로가기를 누르면 다시 이 로그인
// 페이지로 돌아와요. 상단바도 "팝업" 텍스트 로고 대신 뒤로가기 버튼으로
// 바꿨어요.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { redirectToKakaoLogin, redirectToGoogleLogin } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginAsTestUser } = useAuth();

  const handleTestLogin = () => {
    loginAsTestUser();
    try {
      const raw = window.localStorage.getItem("mock_customer");
      const onboarded = raw ? JSON.parse(raw).onboarded : false;
      router.push(onboarded ? "/" : "/signup");
    } catch {
      router.push("/signup");
    }
  };

  return (
    // [수정 8/5] min-h-screen(100vh)은 모바일 브라우저의 주소창이 접혔다 펼쳐지는
    // 걸 반영하지 못해요 - 처음 로드될 땐 주소창이 펼쳐진 상태 기준으로 100vh를
    // 계산해서 화면 아래쪽 버튼이 실제 보이는 영역보다 낮게 잡히고, 스크롤해서
    // 주소창이 접히면 그제서야 버튼이 화면 안으로 들어오는 것처럼 보였어요(신고
    // 주신 "하단에 붙어있고 스크롤하면 내려간다"는 증상과 정확히 일치). 실제 보이는
    // 영역을 따라가는 min-h-dvh(동적 뷰포트 높이)로 바꿔서 항상 한 화면에 딱
    // 맞게 나오도록 했어요.
    <main className="min-h-dvh flex flex-col">
      {/* 상단바 - [수정 8/5] "팝업" 텍스트 로고 링크 대신 뒤로가기 버튼으로 바꿨어요. */}
      <header className="flex items-center h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
      </header>

      {/* [수정 8/5] "구글로 시작하기" 버튼까지 로고/말풍선과 같은 flex-1 영역
          안에 넣어서, 버튼이 화면 아래쪽에 따로 붙어있지 않고 로고와 함께
          화면 가운데로 오도록 했어요. 화면 설정/공지사항/Q&A 링크만 아래쪽에
          남겨서, 그 사이 여백(하단 마진)도 넉넉하게 키웠어요. */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        {/* [신규] 간편 가입 안내 말풍선 - 살짝 동동 뜨는 애니메이션을 넣었어요. */}
        <div className="relative bg-gray-100 dark:bg-[#282B32] rounded-2xl px-5 py-3 animate-float">
          <p className="text-sm font-medium text-center">간편 가입으로 서비스를 편리하게 이용해보세요</p>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-100 dark:bg-[#282B32] rotate-45" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Light.svg" alt="POP-ON" className="w-[220px] h-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Dark.svg" alt="POP-ON" className="w-[220px] h-auto hidden dark:block" />

        <div className="w-full flex flex-col items-center gap-3 mt-6">
          <button
            type="button"
            onClick={redirectToKakaoLogin}
            className="w-full max-w-sm flex items-center gap-3 rounded-full px-5 py-3.5 bg-[#FEE500]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ui/kakao.svg" alt="" width={20} height={20} />
            <span className="flex-1 text-center text-base font-medium text-gray-900">
              카카오로 시작하기
            </span>
          </button>

          <button
            type="button"
            onClick={redirectToGoogleLogin}
            className="w-full max-w-sm flex items-center gap-3 bg-gray-100 dark:bg-[#282B32] rounded-full px-5 py-3.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ui/google.svg" alt="" width={20} height={20} />
            <span className="flex-1 text-center text-base font-medium text-gray-900 dark:text-white">
              구글로 시작하기
            </span>
          </button>

          {process.env.NODE_ENV === "development" && (
            <>
              <button
                type="button"
                onClick={handleTestLogin}
                className="w-full max-w-sm rounded-full py-3.5 text-base font-medium border border-dashed border-gray-300 dark:border-[#282B32] text-gray-500 mt-2"
              >
                [개발용] 테스트 계정으로 계속하기
              </button>
              <Link
                href="/login/dev"
                className="w-full max-w-sm text-center rounded-full py-3.5 text-sm font-medium border border-dashed border-gray-300 dark:border-[#282B32] text-gray-500"
              >
                [개발용] 테스트 ID로 로그인
              </Link>
            </>
          )}
        </div>
      </div>

      {/* [수정 8/5] 화면 설정/공지사항/Q&A - 각각 독립된 화면으로 이동하고,
          그 화면에서 뒤로가기를 누르면 이 로그인 페이지로 돌아와요. 위 버튼
          그룹과 분리되어 보이도록 하단 여백을 넉넉하게 뒀어요. */}
      <div className="flex items-center justify-center gap-3 pt-4 pb-[max(5rem,env(safe-area-inset-bottom))]">
        <Link href="/login/settings" className="text-sm text-gray-400">
          화면 설정
        </Link>
        <span className="text-gray-200 dark:text-[#282B32]" aria-hidden="true">|</span>
        <Link href="/notice" className="text-sm text-gray-400">
          공지사항
        </Link>
        <span className="text-gray-200 dark:text-[#282B32]" aria-hidden="true">|</span>
        <Link href="/login/qna" className="text-sm text-gray-400">
          Q&A
        </Link>
      </div>
    </main>
  );
}