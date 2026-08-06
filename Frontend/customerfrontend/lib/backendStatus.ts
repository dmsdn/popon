// lib/backendStatus.ts
// 백엔드 연결 상태를 전역에서 관리
// 백엔드가 꺼져있거나(연결 자체가 안 됨) 500을 뱉을 때, 상단 배너 하나로 눈에 보이게 알려주기 위한 전역 저장소

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
