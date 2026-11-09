// Kariyeri taşı: kayıt, telefon değiştirirken ya da web ↔ uygulama arasında taşınabilen bir metin koduna çevrilir.
// Sunucu yok: kod kaydın kendisidir (UTF-8 → base64). Büyük ve yeniden üretilebilen alanlar kırpılır.
import type { GameState } from './engine/types';
import { fromB64, fromUtf8, toB64, utf8 } from './b64';
import { parseSave } from './storage';

const PREFIX = 'YOL1:';

/** Kariyer kodu: sosyal akış, haberler ve randevu destesi kırpılır (oyun bunları yeniden üretir). */
export function exportCode(s: GameState): string {
  const slim: GameState = { ...s, sosyal: (s.sosyal ?? []).slice(0, 15), haberler: s.haberler.slice(0, 30), adaylar: undefined };
  return PREFIX + toB64(utf8(JSON.stringify(slim)));
}

/** Koddan kariyer; geçersizse null. Kayıt, eski sürümlerle aynı taşıma adımlarından geçer. */
export function importCode(code: string): GameState | null {
  // Kod bir mesajın içinde de gelebilir: önekten sonrası alınır.
  const i = code.indexOf(PREFIX);
  if (i < 0) return null;
  try {
    // Mesajlaşma uygulamaları uzun metne satır sonu ekleyebilir: çözücü boşlukları zaten atlar.
    return parseSave(fromUtf8(fromB64(code.slice(i + PREFIX.length))));
  } catch {
    return null;
  }
}
