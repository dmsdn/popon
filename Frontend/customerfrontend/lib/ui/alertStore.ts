// lib/ui/alertStore.ts
// 브라우저 기본 alert/confirm 대신 앱 디자인에 맞는 알림·확인 모달을 어디서든 호출할 수 있도록 관리하는 스토어

// React 컴포넌트 밖에서도 appAlert(), appConfirm(), appChoice()를 호출할 수 있고,
// AlertModalRoot가 스토어를 구독해 실제 모달을 화면에 표시
// 여러 요청이 동시에 들어오면 큐에 저장해 하나씩 순서대로 처리

type AlertRequest = {
  id: number;
  kind: "alert" | "confirm";
  message: string;
  resolve: (value: boolean) => void;
  // confirm 모달의 버튼 문구를 상황에 맞게 바꿔야 하는 곳이 있어서, 기본값("확인"/"취소") 대신 직접 지정
  confirmLabel?: string;
  cancelLabel?: string;
};

let currentRequest: AlertRequest | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAlertStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAlertSnapshot() {
  return currentRequest;
}

// 대기 중인 다음 요청이 있으면 이어서 띄워줌
const queue: AlertRequest[] = [];

function showNext() {
  if (currentRequest) return;
  const next = queue.shift();
  if (!next) return;
  currentRequest = next;
  emit();
}

function enqueue(
  kind: AlertRequest["kind"],
  message: string,
  labels?: { confirmLabel?: string; cancelLabel?: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({ id: nextId++, kind, message, resolve, ...labels });
    showNext();
  });
}

// 알림 모달을 표시
export function appAlert(message: string): Promise<void> {
  return enqueue("alert", message).then(() => undefined);
}

// window.confirm(message) 대체. 확인=true, 취소=false
export function appConfirm(message: string): Promise<boolean> {
  return enqueue("confirm", message);
}

// 원하는 버튼 문구를 사용하는 선택 모달을 표시
export function appChoice(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  return enqueue("confirm", message, { confirmLabel, cancelLabel });
}

// AlertModalRoot 전용 - 사용자가 버튼을 눌렀을 때 호출
export function resolveAlertRequest(value: boolean) {
  if (!currentRequest) return;
  currentRequest.resolve(value);
  currentRequest = null;
  emit();
  showNext();
}
