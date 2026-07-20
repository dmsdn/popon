// [임시 스텁] pew 브랜치 커밋에 RankingSection.tsx가 누락되어 빌드가 깨지는 것을 막기 위한 파일.
// pew가 원본 RankingSection을 푸시하면 이 파일은 그쪽 버전으로 교체할 것 (충돌 시 pew 버전 채택).
import { PopupItem } from "@/data/mockPopups";
import { PopupSection } from "@/components/home/PopupSection";

export function RankingSection({ title, items }: { title: string; items: PopupItem[] }) {
  return <PopupSection title={title} items={items} />;
}
