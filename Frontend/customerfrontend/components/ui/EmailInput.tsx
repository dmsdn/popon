"use client";

// 이메일 입력 - 아이디 부분 입력창 + 도메인 드롭다운(gmail.com 등) 조합. 회원가입/정보수정에서 재사용돼요.

import { useState } from "react";

// components/ui/EmailInput.tsx
//
// [신규] 이메일 입력칸을 "아이디 부분"과 "도메인 드롭다운"으로 나눴어요.
// 드롭다운 디자인/동작은 팝업 상세페이지의 정렬(최신순/추천순) 드롭다운과
// 동일한 패턴이에요 - 클릭하면 열리고, 바깥을 누르면 닫혀요.

const DOMAINS = ["gmail.com", "naver.com", "daum.net", "kakao.com", "nate.com", "직접 입력"];

export function EmailInput({
  value,
  onChange,
  placeholder = "이메일",
}: {
  /** "아이디@도메인" 형태의 전체 이메일 문자열 */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [customDomain, setCustomDomain] = useState(false);

  const [local, domain] = splitEmail(value);

  const setLocal = (nextLocal: string) => {
    onChange(domain ? `${nextLocal}@${domain}` : nextLocal);
  };
  const setDomain = (nextDomain: string) => {
    onChange(nextDomain ? `${local}@${nextDomain}` : local);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base outline-none"
      />
      <span className="text-gray-400 flex-none">@</span>

      {customDomain ? (
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="도메인 직접 입력"
          className="flex-1 min-w-0 bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base outline-none"
        />
      ) : (
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowDomainMenu((prev) => !prev)}
            className="w-full flex items-center justify-between bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base"
          >
            <span className={domain ? "" : "text-gray-400"}>{domain || "선택"}</span>
            <span className="text-gray-400 text-sm">▾</span>
          </button>
          {showDomainMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDomainMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] rounded-lg shadow-md py-1 w-full min-w-[160px] max-h-60 overflow-y-auto">
                {DOMAINS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (d === "직접 입력") {
                        setCustomDomain(true);
                        setDomain("");
                      } else {
                        setDomain(d);
                      }
                      setShowDomainMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm ${
                      domain === d ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function splitEmail(value: string): [string, string] {
  const at = value.indexOf("@");
  if (at === -1) return [value, ""];
  return [value.slice(0, at), value.slice(at + 1)];
}
