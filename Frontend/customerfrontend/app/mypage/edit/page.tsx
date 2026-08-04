"use client";

// 내 정보 수정 페이지 - 닉네임/전화번호/이메일/생년월일/성별/프로필사진 편집.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateMyInfo, getKeywords, getMyInterests, type Keyword } from "@/lib/api/customer";
import { submitPreferences } from "@/lib/api/auth";
import { getRegions, getMyRegions, saveMyRegions, type Region } from "@/lib/api/regions";
import { formatPhoneInput, isValidPhone } from "@/lib/utils/formatPhone";
import { BirthDatePicker } from "@/components/ui/BirthDatePicker";
import { EmailInput } from "@/components/ui/EmailInput";
import { ImageCropModal } from "@/components/popup/ImageCropModal";
import { uploadFile } from "@/lib/api/upload";
import { appAlert } from "@/lib/ui/alertStore";

export default function EditProfilePage() {
  const router = useRouter();
  const { customer, loading, refresh } = useAuth();

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");
  const [birthDate, setBirthDate] = useState("");
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<number[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // [신규] 프로필 사진 수정 - 파일 선택 → 정사각형으로 자르기 → 업로드 → 저장
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !customer) {
      router.replace("/login");
    }
  }, [loading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    setNickname(customer.nickname);
    // [수정] 저장된 전화번호가 하이픈 없이("01012345678") 들어있으면 isValidPhone
    // 검증(010-0000-0000 형식만 허용)을 못 통과해서 "저장하기" 버튼이 계속 비활성화
    // 상태로 남아있었어요. 불러올 때 항상 포맷을 맞춰줍니다.
    setPhone(formatPhoneInput(customer.phone ?? ""));
    setEmail(customer.email ?? "");
    setGender(customer.gender ?? "UNKNOWN");
    setBirthDate(customer.birthDate ?? "");
    setProfileImage(customer.profileImage ?? null);
  }, [customer]);

  // [수정] "관심 카테고리"가 로컬 전용 목록을 쓰고 있어서, 회원가입 때 저장한 실제
  // 관심 키워드(백엔드)랑 완전히 따로 놀았어요. 이제 signup/preferences와 동일하게
  // 진짜 keyword API를 쓰고, 새로 생긴 GET /api/customer/interests로 기존 선택값도
  // 미리 체크된 상태로 보여줍니다.
  useEffect(() => {
    getKeywords()
      .then(setKeywords)
      .catch((err) => console.error("키워드 목록 조회 실패", err));
    getMyInterests()
      .then((res) => setSelectedKeywordIds(res?.keywordIds ?? []))
      .catch((err) => console.error("내 관심 키워드 조회 실패", err));
  }, []);

  // [수정] 관심 지역도 백엔드가 이제 동네 단위(성수/강남/홍대)로 관리되기 시작해서,
  // 로컬 저장 대신 실제 API로 연결했어요. 기존 선택값도 GET .../regions/mine으로
  // 미리 채웁니다.
  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch((err) => console.error("지역 목록 조회 실패", err));
    getMyRegions()
      .then((res) => setSelectedRegionIds(res?.regionIds ?? []))
      .catch((err) => console.error("내 관심 지역 조회 실패", err));
  }, []);

  const toggleRegion = (id: number) => {
    setSelectedRegionIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };
  const toggleKeyword = (id: number) => {
    setSelectedKeywordIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const canSubmit = nickname.trim().length > 0 && isValidPhone(phone);

  // [신규] 크롭 완료된 이미지를 업로드하고, 미리보기도 바로 바꿔줘요.
  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null);
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const file = new File([blob], "profile.jpg", { type: blob.type || "image/jpeg" });
      const result = await uploadFile(file);
      setProfileImage(result.url);
    } catch (err) {
      console.error("프로필 사진 업로드 실패", err);
      setPhotoError("사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    setNicknameError(null);
    // [수정] 전화번호가 선택값이었는데, 회원가입 때는 필수로 받으면서 여기선 안 받으면
    // 나중에 웨이팅 등록처럼 전화번호가 꼭 필요한 기능에서 막히는 사람이 생겨요.
    // 필수로 바꾸고, 형식도 010-0000-0000으로 맞춰야 저장되게 검증을 추가했어요.
    if (!isValidPhone(phone)) {
      setPhoneError("전화번호를 010-0000-0000 형식으로 입력해주세요.");
      return;
    }
    if (!nickname.trim()) return;
    setSubmitting(true);
    try {
      await updateMyInfo({
        nickname: nickname.trim(),
        phone,
        email: email.trim() || undefined,
        gender,
        birthDate: birthDate || undefined,
        profileImage: profileImage ?? undefined,
      });
      await submitPreferences(selectedKeywordIds);
      await saveMyRegions(selectedRegionIds);
      await refresh();
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/mypage?menu=내 정보");
      }
    } catch (err) {
      console.error("정보 수정 실패", err);
      const message = err instanceof Error ? err.message : "수정에 실패했어요. 잠시 후 다시 시도해주세요.";
      // 백엔드가 닉네임 중복이면 "이미 사용 중인 닉네임이에요." 메시지를 내려줘요
      if (message.includes("닉네임")) {
        setNicknameError(message);
      } else {
        await appAlert(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !customer) return null;

  return (
    <main className="w-full mobile:max-w-[600px] mobile:mx-auto min-h-screen flex flex-col px-6 py-10">
      <button type="button" onClick={() => router.back()} className="self-start text-sm text-gray-500 mb-6">
        <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
          <span>뒤로</span>
      </button>

      <h1 className="text-lg font-bold mb-8">내 정보 수정</h1>

      {/* [신규] 프로필 사진 수정 - 눌러서 파일 선택하면 정사각형으로 자른 뒤 업로드돼요. */}
      <div className="flex flex-col items-center mb-8">
        {/* [수정] overflow-hidden이 바깥(label)에 있어서 카메라 버튼이 원 밖으로
            잘리고 있었어요 - 이미지를 감싸는 안쪽 div로 옮겼어요. */}
        <label className="relative w-24 h-24 cursor-pointer">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#282B32] overflow-hidden">
            {profileImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt="" className="w-full h-full object-cover" />
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">
                업로드 중...
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-900 dark:bg-[#282B32] border-2 border-white dark:border-[#282B32] flex items-center justify-center">
            <img src="/icons/ui/picture.svg" alt="" width={14} height={14} className="invert" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCropFile(file);
              e.target.value = ""; // 같은 파일 다시 선택해도 onChange가 또 뜨도록
            }}
          />
        </label>
        {photoError && <p className="text-sm text-red-500 mt-2">{photoError}</p>}
      </div>

      <div className="flex flex-col gap-6">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">닉네임</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameError(null);
            }}
            className={`w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none ${
              nicknameError ? "ring-1 ring-red-400" : ""
            }`}
          />
          {nicknameError && <p className="text-sm text-red-500 mt-1.5">{nicknameError}</p>}
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            전화번호 <span className="text-red-400">*</span>
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneInput(e.target.value));
              setPhoneError(null);
            }}
            placeholder="010-0000-0000"
            maxLength={13}
            className={`w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none ${
              phoneError ? "ring-1 ring-red-400" : ""
            }`}
          />
          {phoneError && <p className="text-sm text-red-500 mt-1.5">{phoneError}</p>}
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이메일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <EmailInput value={email} onChange={setEmail} />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">성별</span>
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
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm border ${
                  gender === value ? "border-gray-900 text-gray-900 dark:text-white font-medium" : "border-gray-200 dark:border-[#282B32] text-gray-500"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    gender === value ? "border-gray-900 dark:border-white" : "border-gray-300 dark:border-[#282B32]"
                  }`}
                >
                  {gender === value && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">생년월일</span>
          <button
            type="button"
            onClick={() => setShowBirthPicker(true)}
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm text-left"
          >
            {birthDate || <span className="text-gray-400">생년월일을 선택해주세요</span>}
          </button>
        </div>
        {showBirthPicker && (
          <BirthDatePicker value={birthDate} onChange={setBirthDate} onClose={() => setShowBirthPicker(false)} />
        )}

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">관심 카테고리</span>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <button
                key={kw.id}
                type="button"
                onClick={() => toggleKeyword(kw.id)}
                className={`px-4 py-2 rounded-full text-sm border ${
                  selectedKeywordIds.includes(kw.id)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                }`}
              >
                {kw.name}
              </button>
            ))}
          </div>
        </div>

        {/* [수정] 백엔드 region이 이제 동네 단위(성수/강남/홍대)라, 하드코딩 목록 대신
            실제 GET /api/regions로 받아온 목록을 씁니다. */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">관심 지역</span>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRegion(r.id)}
                className={`px-4 py-2 rounded-full text-sm border ${
                  selectedRegionIds.includes(r.id)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-900 text-white disabled:opacity-50 mt-4"
        >
          {submitting ? "저장하는 중..." : "저장하기"}
        </button>
      </div>

      {cropFile && (
        <ImageCropModal file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />
      )}
    </main>
  );
}
