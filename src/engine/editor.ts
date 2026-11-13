// Editör: organizasyon adları ve UCC kadrosu (herkese açık) + paylaşılabilir editör kodu.
// Düzenlemeler ORGS ve kadro dizileri üzerinde yerinde uygulanır; orijinaller saklanır, sıfırlanabilir.
// Kariyerdeki UCC yıldızları kimliklerini orijinal isimden alır, ad değişse de aynı kişi sayılır.
import { fromB64, fromUtf8, toB64, utf8 } from '../b64';
import { BACKGROUNDS, ORGS } from './data';
import type { Background, GameState, OrgId, WeightClass } from './types';
import { UCC_MEN, UCC_WOMEN, type Star } from './uccRoster';

export type OrgEdit = { ad?: string; kisa?: string };
export type StarEdit = { ad?: string; soyad?: string; lakap?: string; uyruk?: string; stil?: Background };
export interface EditorData {
  org: Partial<Record<OrgId, OrgEdit>>;
  /** Anahtar: yıldızın orijinal kimliği (starKey) */
  ucc: Record<string, StarEdit>;
}
export const emptyEditor = (): EditorData => ({ org: {}, ucc: {} });

/** Orijinal isimden kalıcı kimlik (opponents.ts'teki ucc- kimliğiyle aynı) */
export const starId = (ad: string, soyad: string) => `ucc-${ad}-${soyad}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

// ---------- Orijinaller ----------
type RosterRef = { star: Star; orig: Star; key: string; siklet: WeightClass; kadin: boolean; sira: number };
const ORIG_ORG = Object.fromEntries((Object.keys(ORGS) as OrgId[]).map((k) => [k, { ad: ORGS[k].ad, kisa: ORGS[k].kisa }])) as Record<OrgId, { ad: string; kisa: string }>;
const ROSTER: RosterRef[] = [];
for (const [kadin, table] of [
  [false, UCC_MEN],
  [true, UCC_WOMEN],
] as const) {
  for (const [siklet, list] of Object.entries(table) as [WeightClass, Star[]][]) {
    (list ?? []).forEach((star, sira) => {
      const orig = { ...star };
      star.key = starId(orig.ad, orig.soyad);
      ROSTER.push({ star, orig, key: star.key, siklet, kadin, sira });
    });
  }
}
export const rosterRefs = () => ROSTER;
export const origOrg = (o: OrgId) => ORIG_ORG[o];

// ---------- Uygula ----------
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : '');

/** Düzenlemeleri ORGS'a ve kadroya uygular (boş alan = orijinal). */
export function applyEditor(d: EditorData) {
  for (const k of Object.keys(ORIG_ORG) as OrgId[]) {
    const e = d.org[k];
    ORGS[k].ad = clean(e?.ad, 32) || ORIG_ORG[k].ad;
    ORGS[k].kisa = clean(e?.kisa, 10) || ORIG_ORG[k].kisa;
  }
  for (const r of ROSTER) {
    const e = d.ucc[r.key];
    r.star.ad = clean(e?.ad, 20) || r.orig.ad;
    r.star.soyad = clean(e?.soyad, 24) || r.orig.soyad;
    r.star.lakap = clean(e?.lakap, 28) || r.orig.lakap;
    r.star.uyruk = clean(e?.uyruk, 24) || r.orig.uyruk;
    r.star.stil = e?.stil && e.stil in BACKGROUNDS ? e.stil : r.orig.stil;
  }
}

/**
 * Kayıttaki UCC yıldızlarının adlarını güncel kadroya çeker (kimlik orijinal isimden geldiği için güvenli).
 * Geçmiş haber metinleri değişmez; yalnızca rakip nesneleri güncellenir. Değişiklik olduysa true.
 */
export function renameInState(s: GameState): boolean {
  const byKey = new Map(ROSTER.map((r) => [r.key, r.star]));
  let changed = false;
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== 'object' || depth > 6 || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'string' && o.id.startsWith('ucc-') && 'soyad' in o && 'stats' in o) {
      const st = byKey.get(o.id);
      if (st && (o.ad !== st.ad || o.soyad !== st.soyad || o.lakap !== st.lakap || o.uyruk !== st.uyruk)) {
        o.ad = st.ad;
        o.soyad = st.soyad;
        o.lakap = st.lakap;
        o.uyruk = st.uyruk;
        changed = true;
      }
      return;
    }
    for (const k of Object.keys(o)) if (k !== 'haberler' && k !== 'gecmis' && k !== 'sosyal' && k !== 'dm') walk(o[k], depth + 1);
  };
  walk(s, 0);
  return changed;
}

// ---------- Paylaşım kodu ----------
const PREFIX = 'YOLED1:';
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Yalnızca değişen alanlar kodlanır (kısa kod) */
export function editorCode(d: EditorData): string {
  const json = JSON.stringify({ o: d.org, u: d.ucc });
  return PREFIX + toB64(utf8(json + '|' + hash(json)));
}

/** Kodu çözer ve her alanı doğrular; geçersizse null. */
export function readEditorCode(raw: string): EditorData | null {
  try {
    const t = raw.trim().replace(/\s+/g, '');
    if (!t.startsWith(PREFIX)) return null;
    const txt = fromUtf8(fromB64(t.slice(PREFIX.length)));
    const i = txt.lastIndexOf('|');
    const json = txt.slice(0, i);
    if (hash(json) !== txt.slice(i + 1)) return null;
    const p = JSON.parse(json) as { o?: Record<string, OrgEdit>; u?: Record<string, StarEdit> };
    const out = emptyEditor();
    for (const k of Object.keys(ORIG_ORG) as OrgId[]) {
      const e = p.o?.[k];
      if (e) out.org[k] = { ad: clean(e.ad, 32) || undefined, kisa: clean(e.kisa, 10) || undefined };
    }
    const keys = new Set(ROSTER.map((r) => r.key));
    for (const [k, e] of Object.entries(p.u ?? {})) {
      if (!keys.has(k) || !e) continue;
      out.ucc[k] = { ad: clean(e.ad, 20) || undefined, soyad: clean(e.soyad, 24) || undefined, lakap: clean(e.lakap, 28) || undefined, uyruk: clean(e.uyruk, 24) || undefined, stil: e.stil && e.stil in BACKGROUNDS ? e.stil : undefined };
    }
    return out;
  } catch {
    return null;
  }
}

/** Düzenleme sayısı (kart özetleri için) */
export const editCount = (d: EditorData) => Object.values(d.org).filter((e) => e && (e.ad || e.kisa)).length + Object.values(d.ucc).filter((e) => e && Object.values(e).some(Boolean)).length;
