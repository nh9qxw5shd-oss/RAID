const ICON = '/icon.svg';

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return 'denied';
  return Notification.requestPermission();
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // SW registration is non-critical
  }
}

function show(title: string, body: string, url?: string): void {
  if (!isSupported() || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: ICON });
  if (url) {
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }
}

export function notifyDebriefPublished(title: string, debriefId: string): void {
  show(
    'Debrief Published',
    `"${title || 'Untitled incident'}" has been published and is ready for review.`,
    `/debrief/${debriefId}`,
  );
}

export function notifyCommentAdded(debriefTitle: string, isDirective = false): void {
  const body = isDirective
    ? `A response has been posted to a directive in "${debriefTitle || 'a debrief'}".`
    : `New commentary added to "${debriefTitle || 'a debrief'}".`;
  show('New Comment', body);
}
