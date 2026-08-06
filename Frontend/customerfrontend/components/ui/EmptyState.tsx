// components/ui/EmptyState.tsx
// 로딩중이거나 데이터가 없을 때 보여주는 공용 빈 상태/로딩 상태 컴포넌트

export function EmptyState({
  message,
  icon = null,
  className = "",
}: {
  message: string;
  icon?: string | null; // 기본값 null - 문구만
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

// 로딩 중
export function LoadingState({ message = "불러오는 중...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-[#282B32] border-t-gray-400 animate-spin mb-3" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
