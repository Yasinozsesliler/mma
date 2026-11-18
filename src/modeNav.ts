// Oyun içinden (ör. kariyer ana ekranındaki kişisel teklif) başka bir moda geçiş isteği. App dinler ve görünümü değiştirir.
export type ModeView = 'menu' | 'manager' | 'patron';

let handler: ((v: ModeView) => void) | null = null;

export function onModeRequest(fn: (v: ModeView) => void) {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function requestMode(v: ModeView) {
  handler?.(v);
}
