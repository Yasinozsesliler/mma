// Editör (uygulama tarafı): düzenlemeleri cihazda saklar, açılışta uygular, ekranları yeniler.
import { useSyncExternalStore } from 'react';
import { applyEditor, emptyEditor, type EditorData } from './engine/editor';
import { getPref, setPref } from './prefs';

const KEY = 'yol_editor';

function load(): EditorData {
  try {
    const d = JSON.parse(getPref(KEY) || 'null') as EditorData | null;
    return d && typeof d === 'object' ? { org: d.org ?? {}, ucc: d.ucc ?? {} } : emptyEditor();
  } catch {
    return emptyEditor();
  }
}

let data = load();
// Uygulama açılırken (kayıtlar yüklenmeden önce) düzenlemeler uygulanır
applyEditor(data);

const subs = new Set<() => void>();
export const useEditor = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => data,
    () => data,
  );
export const editorData = () => data;

export function setEditor(next: EditorData) {
  data = next;
  setPref(KEY, JSON.stringify(next));
  applyEditor(next);
  subs.forEach((f) => f());
}
