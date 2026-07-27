"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateMyInfo } from "@/lib/api/customer";
import {
  REGIONS,
  CATEGORIES,
  getPreferredRegions,
  getPreferredCategories,
  setPreferredRegions,
  setPreferredCategories,
} from "@/lib/preferences";

export default function EditProfilePage() {
  const router = useRouter();
  const { customer, loading, refresh } = useAuth();

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");
  const [birthDate, setBirthDate] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !customer) {
      router.replace("/login");
    }
  }, [loading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    setNickname(customer.nickname);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setGender(customer.gender ?? "UNKNOWN");
    setBirthDate(customer.birthDate ?? "");
    setRegions(getPreferredRegions());
    setCategories(getPreferredCategories());
  }, [customer]);

  const toggleRegion = (region: string) => {
    setRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]));
  };
  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    setSubmitting(true);
    try {
      await updateMyInfo({
        nickname: nickname.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gender,
        birthDate: birthDate || undefined,
      });
      setPreferredRegions(regions);
      setPreferredCategories(categories);
      await refresh();
      // [수정] 여기도 review 페이지와 같은 이유로 push 대신 back()을 씁니다 —
      // 마이페이지에서 "내 정보 수정"으로 들어온 화면이라 back()이 자연스러운 복귀예요.
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/mypage?menu=내 정보");
      }
    } catch (err) {
      console.error("정보 수정 실패", err);
      alert(err instanceof Error ? err.message : "수정에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !customer) return null;

  return (
    <main className="w-full mobile:max-w-[600px] mobile:mx-auto min-h-screen px-6 py-10">
      <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 mb-6">
        ‹ 뒤로
      </button>

      <h1 className="text-lg font-bold mb-8">내 정보 수정</h1>

      <div className="flex flex-col gap-6">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">닉네임</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">전화번호</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            이메일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="000@example.com"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">성별</span>
          <div className="flex gap-2">
            {([
              ["MALE", "남성"],
              ["FEMALE", "여성"],
              ["UNKNOWN", "선택 안 함"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                className={`flex-1 rounded-full py-2.5 text-sm border ${
                  gender === value ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">생년월일</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">관심 카테고리</span>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`aspect-square rounded-[4px] text-xs font-medium flex items-center justify-center text-center px-1 border ${
                  categories.includes(category)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">관심 지역</span>
          <div className="grid grid-cols-4 gap-2">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => toggleRegion(region)}
                className={`aspect-square rounded-[4px] text-xs font-medium flex items-center justify-center text-center px-1 border ${
                  regions.includes(region)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !nickname.trim()}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-50 mt-4"
        >
          {submitting ? "저장하는 중..." : "저장하기"}
        </button>
      </div>
    </main>
  );
}
