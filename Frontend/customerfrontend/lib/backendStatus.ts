// lib/backendStatus.ts
//
// 백엔드가 꺼져있거나(연결 자체가 안 됨) 500을 뱉을 때, 화면 곳곳에서 콘솔에만
// 조용히 에러가 찍히던 걸 상단 배너 하나로 눈에 보이게 알려주기 위한 아주 작은 전역 저장소예요.
// (찜 기능의 wishlistStore.ts와 같은 방식 - useSyncExternalStore로 구독)

let isDown = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeBackendStatus(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBackendStatusSnapshot() {
  return isDown;
}

export function markBackendDown() {
  if (!isDown) {
    isDown = true;
    notify();
  }
}

export function markBackendUp() {
  if (isDown) {
    isDown = false;
    notify();
  }
}
