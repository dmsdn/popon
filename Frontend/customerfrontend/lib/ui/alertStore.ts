// lib/ui/alertStore.ts
//
// window.alert()/window.confirm()은 브라우저 기본 팝업이라 앱 디자인과 안 맞고,
// 모바일 웹뷰에선 아예 안 뜨는 경우도 있어요. 그래서 앱 스타일의 모달로
// 통일했어요.
//
// AuthContext.tsx처럼 React 컴포넌트 트리 바깥(인터셉터 등)에서도 alert를
// 띄워야 하는 곳이 있어서, 훅이 아니라 "구독 가능한 스토어" 형태로 만들었어요 -
// 어디서든 이 파일의 appAlert()/appConfirm()을 그냥 함수처럼 부르면 돼요.
// 실제 렌더링은 AlertModalRoot(레이아웃에 한 번만 마운트)가 이 스토어를
// 구독해서 처리해요.

type AlertRequest = {
  id: number;
  kind: "alert" | "confirm";
  message: string;
  resolve: (value: boolean) => void;
  // [신규] "예약 상세 보기 / 계속 둘러보기"처럼 confirm 모달의 버튼 문구를
  // 상황에 맞게 바꿔야 하는 곳이 있어서, 기본값("확인"/"취소") 대신 직접
  // 지정할 수 있게 했어요.
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

// 대기 중인 다음 요청이 있으면 이어서 띄워요 (동시에 여러 곳에서 호출되는
// 경우를 대비한 아주 단순한 큐 - 실제로는 거의 한 번에 하나씩만 떠요).
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

/** window.alert(message) 대체. await로 닫힐 때까지 기다릴 수 있어요. */
export function appAlert(message: string): Promise<void> {
  return enqueue("alert", message).then(() => undefined);
}

/** window.confirm(message) 대체. 확인=true, 취소=false. */
export function appConfirm(message: string): Promise<boolean> {
  return enqueue("confirm", message);
}

/**
 * "예약 상세 보기 / 계속 둘러보기"처럼, 확인/취소가 아니라 둘 다 "선택지"인
 * 경우를 위한 confirm 변형. confirmLabel을 고르면 true, cancelLabel을 고르면
 * false를 반환해요.
 */
export function appChoice(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  return enqueue("confirm", message, { confirmLabel, cancelLabel });
}

/** AlertModalRoot 전용 - 사용자가 버튼을 눌렀을 때 호출해요. */
export function resolveAlertRequest(value: boolean) {
  if (!currentRequest) return;
  currentRequest.resolve(value);
  currentRequest = null;
  emit();
  showNext();
}
