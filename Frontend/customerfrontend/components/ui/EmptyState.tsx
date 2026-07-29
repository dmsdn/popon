// components/ui/EmptyState.tsx
//
// [신규] 로딩중이거나 데이터가 없을 때 텍스트 한 줄만 덩그러니 뜨던 화면들이
// 너무 비어보인다는 피드백이 있어서, 아이콘 + 문구로 통일된 빈 상태 컴포넌트를
// 만들었어요. 회색 라인 아이콘이라 화면 톤이랑도 잘 맞아요.
// [수정] 아이콘을 인라인 React 컴포넌트 대신 public/icons/의 실제 svg 파일로 교체.

export function EmptyState({
  message,
  icon = "/icons/pin.svg",
  className = "",
}: {
  message: string;
  icon?: string | null; // null을 넘기면 아이콘 없이 텍스트만 보여요
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" width={32} height={32} className="opacity-40 mb-3" />
      )}
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

/**
 * 로딩 중일 때. 살짝 도는 원형 스피너 + 문구 조합이에요.
 */
export function LoadingState({ message = "불러오는 중...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin mb-3" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
