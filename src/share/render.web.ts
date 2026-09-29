// Web: paylaşım kartı 1080×1920 (hikâye boyutu) bir tuvale çizilir ve PNG olarak paylaşılır/indirilir.
// Portre ve kemer, ekranda (gizli) çizilen SVG'lerden alınır; yazılar oyunun kendi yazı tipleriyle çizilir.
import { L, LOC } from '../i18n';
import { C, F } from '../ui/theme';
import type { ShareCardData } from './types';

export const CAN_SHARE = true;
const WD = 1080;
const HT = 1920;

type Doc = Document & { fonts?: FontFaceSet };
const doc = () => (globalThis as { document?: Doc }).document;

/** Gizli kaptaki SVG'yi yüksek çözünürlüklü bir resme çevirir. */
async function svgImage(containerId: string): Promise<HTMLImageElement | null> {
  const svg = doc()?.querySelector(`#${containerId} svg`);
  if (!svg) return null;
  let xml = new XMLSerializer().serializeToString(svg);
  if (!xml.includes('xmlns=')) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode().catch(() => undefined);
  return img.complete && img.naturalWidth ? img : null;
}

function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, max: number) {
  let px = start;
  ctx.font = font(px);
  while (px > 24 && ctx.measureText(text).width > max) {
    px -= 4;
    ctx.font = font(px);
  }
  return px;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const up = (s: string) => s.toLocaleUpperCase(LOC);

export async function renderCard(d: ShareCardData, avatarId: string, beltId: string): Promise<{ url: string; file: File | null } | null> {
  const D = doc();
  if (!D) return null;
  await Promise.all(
    [`700 100px ${F.display}`, `500 60px ${F.displayMed}`, `700 40px ${F.bold}`, `400 40px ${F.body}`, `600 40px ${F.semi}`].map((f) => D.fonts?.load(f).catch(() => undefined)),
  );
  const [avatar, belt] = await Promise.all([svgImage(avatarId), d.kemer ? svgImage(beltId) : Promise.resolve(null)]);
  if (d.tur === 'wiki') return renderWiki(d, avatar);

  const cv = D.createElement('canvas');
  cv.width = WD;
  cv.height = HT;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const gold = C.gold;
  const accent = d.tur === 'kemer' || d.tur === 'kariyer' ? gold : C.red;

  // Arka plan: koyu, kırmızı bir parlama ve çapraz yayın çizgileri
  const bg = ctx.createLinearGradient(0, 0, 0, HT);
  bg.addColorStop(0, '#1c070b');
  bg.addColorStop(0.45, '#0b0c10');
  bg.addColorStop(1, '#040405');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WD, HT);
  const glow = ctx.createRadialGradient(WD / 2, 640, 40, WD / 2, 640, 620);
  glow.addColorStop(0, d.tur === 'kemer' ? 'rgba(242,193,78,0.30)' : 'rgba(230,57,70,0.32)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WD, HT);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = C.red;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const x = -300 + i * 140;
    ctx.moveTo(x, HT);
    ctx.lineTo(x + 26, HT);
    ctx.lineTo(x + 26 + 900, 0);
    ctx.lineTo(x + 900, 0);
    ctx.fill();
  }
  ctx.restore();

  // Üst marka
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.red;
  ctx.font = `700 34px ${F.display}`;
  ctx.fillText('Y  O  L', WD / 2, 96);
  ctx.fillStyle = 'rgba(241,242,245,0.55)';
  ctx.font = `500 28px ${F.displayMed}`;
  ctx.fillText(up(d.mesaj.split('·')[0].trim()), WD / 2, 138);

  // Başlık (eğik, yayın grafiği gibi)
  ctx.save();
  ctx.translate(WD / 2, 250);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  const tpx = fit(ctx, up(d.baslik), (p) => `700 ${p}px ${F.display}`, 104, 960);
  ctx.fillStyle = accent;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillText(up(d.baslik), 0, 0);
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.fillRect(WD / 2 - 110, 250 + tpx * 0.18, 220, 6);

  // Portre
  const aY = 320;
  const aS = d.kemer ? 470 : 560;
  if (avatar) {
    ctx.save();
    ctx.shadowColor = d.tur === 'kemer' ? 'rgba(242,193,78,0.55)' : 'rgba(230,57,70,0.55)';
    ctx.shadowBlur = 60;
    ctx.drawImage(avatar, WD / 2 - aS / 2, aY, aS, aS);
    ctx.restore();
  }

  // Kemer (portrenin altına biner)
  let y = aY + aS + 30;
  if (belt) {
    const bw = 900;
    const bh = (belt.naturalHeight / belt.naturalWidth) * bw;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 30;
    ctx.drawImage(belt, WD / 2 - bw / 2, aY + aS - bh * 0.42, bw, bh);
    ctx.restore();
    y = aY + aS - bh * 0.42 + bh + 40;
  }

  // İsim
  if (d.lakap) {
    ctx.fillStyle = gold;
    ctx.font = `500 50px ${F.displayMed}`;
    ctx.fillText(`“${up(d.lakap)}”`, WD / 2, y + 40);
    y += 64;
  }
  ctx.save();
  ctx.translate(WD / 2, y + 110);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  fit(ctx, d.adBuyuk ?? up(d.ad), (p) => `700 ${p}px ${F.display}`, 132, 980);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(d.adBuyuk ?? up(d.ad), 0, 0);
  ctx.restore();
  y += 170;
  ctx.fillStyle = '#d9dbe0';
  fit(ctx, d.ust, (p) => `700 ${p}px ${F.bold}`, 42, 980);
  ctx.fillText(d.ust, WD / 2, y);
  y += 50;

  // Üç bilgi kutusu
  const n = d.kutular.length;
  const gap = 24;
  const bw = (WD - 120 - gap * (n - 1)) / n;
  const by = Math.min(y + 20, HT - 520);
  d.kutular.forEach(([lab, val], i) => {
    const x = 60 + i * (bw + gap);
    roundRect(ctx, x, by, bw, 170, 18);
    ctx.fillStyle = 'rgba(18,20,25,0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = i === 0 ? accent : '#2a2d35';
    ctx.stroke();
    ctx.fillStyle = C.faint;
    ctx.font = `600 28px ${F.semi}`;
    ctx.fillText(up(lab), x + bw / 2, by + 52);
    ctx.fillStyle = '#ffffff';
    fit(ctx, val, (p) => `700 ${p}px ${F.display}`, 68, bw - 30);
    ctx.fillText(val, x + bw / 2, by + 132);
  });

  // Hikâye cümlesi
  ctx.fillStyle = '#b9bec8';
  ctx.font = `400 40px ${F.body}`;
  let ly = by + 236;
  wrap(ctx, d.alt, 940)
    .slice(0, 2)
    .forEach((l) => {
      ctx.fillText(l, WD / 2, ly);
      ly += 54;
    });

  // Alt bant: oyuna davet
  ctx.fillStyle = C.red;
  ctx.fillRect(0, HT - 156, WD, 6);
  ctx.fillStyle = 'rgba(10,11,14,0.95)';
  ctx.fillRect(0, HT - 150, WD, 150);
  const host = (globalThis as { location?: Location }).location?.host ?? '';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 40px ${F.display}`;
  ctx.fillText(up(d.mesaj.split('·').slice(1).join('·').trim() || d.mesaj), WD / 2, HT - 86);
  ctx.fillStyle = gold;
  ctx.font = `700 36px ${F.bold}`;
  if (host) ctx.fillText(host, WD / 2, HT - 36);

  const url = cv.toDataURL('image/png');
  const blob: Blob | null = await new Promise((r) => cv.toBlob((b) => r(b), 'image/png'));
  const file = blob ? new File([blob], `yol-${d.tur}.png`, { type: 'image/png' }) : null;
  return { url, file };
}

const SERIF = 'Georgia, "Times New Roman", serif';
const W_ = { text: '#202122', gray: '#54595d', line: '#a2a9b1', box: '#f8f9fa', head: '#cedff2' };

async function toFile(cv: HTMLCanvasElement, tur: string) {
  const url = cv.toDataURL('image/png');
  const blob: Blob | null = await new Promise((r) => cv.toBlob((b) => r(b), 'image/png'));
  return { url, file: blob ? new File([blob], `yol-${tur}.png`, { type: 'image/png' }) : null };
}

/** Kafespedia kartı: beyaz ansiklopedi sayfası (yerel çizimle aynı yerleşim, 3 kat). */
async function renderWiki(d: ShareCardData, avatar: HTMLImageElement | null) {
  const w = d.wiki!;
  const cv = doc()!.createElement('canvas');
  cv.width = WD;
  cv.height = HT;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const P = 48;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WD, HT);
  // Üst şerit ve logo
  ctx.fillStyle = W_.box;
  ctx.fillRect(0, 0, WD, 138);
  ctx.fillStyle = W_.line;
  ctx.fillRect(0, 138, WD, 3);
  ctx.strokeStyle = W_.text;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(P + 42, 69, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = W_.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `52px ${SERIF}`;
  ctx.fillText('K', P + 42, 72);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `52px ${SERIF}`;
  ctx.fillText(L("Kafespedia"), P + 108, 70);
  ctx.fillStyle = W_.gray;
  ctx.font = `24px ${SERIF}`;
  ctx.fillText(L("Özgür dövüş ansiklopedisi"), P + 110, 106);
  // Başlık
  ctx.fillStyle = W_.text;
  fit(ctx, d.baslik, (px) => `${px}px ${SERIF}`, 84, WD - P * 2);
  ctx.fillText(d.baslik, P, 250);
  ctx.fillStyle = W_.line;
  ctx.fillRect(P, 268, WD - P * 2, 3);
  ctx.fillStyle = W_.gray;
  ctx.font = `italic 27px ${SERIF}`;
  ctx.fillText(L("Kafespedia, özgür dövüş ansiklopedisi"), P, 308);
  // Bilgi kutusu
  const bx = P;
  const bw = WD - P * 2;
  const rows = w.bilgi;
  const bh = 12 + 54 + 360 + rows.length * 50 + 12;
  const by = 336;
  ctx.fillStyle = W_.box;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = W_.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = W_.head;
  ctx.fillRect(bx + 12, by + 12, bw - 24, 54);
  ctx.fillStyle = W_.text;
  ctx.textAlign = 'center';
  const head = d.lakap ? `${d.ad} “${d.lakap}”` : d.ad;
  fit(ctx, head, (px) => `bold ${px}px ${SERIF}`, 36, bw - 60);
  ctx.fillText(head, WD / 2, by + 52);
  if (avatar) ctx.drawImage(avatar, WD / 2 - 168, by + 78, 336, 336);
  ctx.textAlign = 'left';
  rows.forEach(([k, v], i) => {
    const y = by + 66 + 360 + i * 50;
    ctx.fillStyle = '#eaecf0';
    ctx.fillRect(bx + 12, y, bw - 24, 3);
    ctx.fillStyle = W_.text;
    ctx.font = `700 28px ${F.bold}`;
    ctx.fillText(k, bx + 24, y + 36);
    ctx.font = `400 28px ${F.body}`;
    const max = bw - 24 - 380;
    let val = v;
    while (ctx.measureText(val).width > max && val.length > 3) val = val.slice(0, -2);
    ctx.fillText(val === v ? v : val + '…', bx + 380, y + 36);
  });
  // Giriş paragrafı
  ctx.fillStyle = W_.text;
  ctx.font = `34px ${SERIF}`;
  const lines = wrap(ctx, w.ozet, WD - P * 2);
  const maxLines = Math.floor((HT - 170 - (by + bh + 40)) / 48);
  lines.slice(0, maxLines).forEach((l, i) => {
    const last = i === maxLines - 1 && lines.length > maxLines;
    ctx.fillText(last ? l.replace(/\s+\S*$/, '') + '…' : l, P, by + bh + 70 + i * 48);
  });
  // Alt şerit
  ctx.fillStyle = C.red;
  ctx.fillRect(0, HT - 156, WD, 6);
  ctx.fillStyle = 'rgba(10,11,14,0.97)';
  ctx.fillRect(0, HT - 150, WD, 150);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 40px ${F.display}`;
  ctx.fillText(up(L("YOL: Kafesten Kemere · Kendi efsaneni yaz")), WD / 2, HT - 86);
  const host = (globalThis as { location?: Location }).location?.host ?? '';
  ctx.fillStyle = C.gold;
  ctx.font = `700 36px ${F.bold}`;
  if (host) ctx.fillText(host, WD / 2, HT - 36);
  return toFile(cv, 'wiki');
}

/** Telefonun paylaşım menüsünü açar; desteklenmiyorsa görseli indirir. Kullanıcı dokunuşunun içinde çağrılmalı. */
export async function shareCard(card: { url: string; file: File | null }, text: string): Promise<'paylasildi' | 'indirildi' | 'iptal'> {
  const nav = globalThis.navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const url = (globalThis as { location?: Location }).location?.origin;
  if (card.file && nav?.canShare?.({ files: [card.file] })) {
    try {
      await nav.share({ files: [card.file], text: url ? `${text} ${url}` : text });
      return 'paylasildi';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'iptal';
    }
  }
  return saveCard(card);
}

export function saveCard(card: { url: string; file: File | null }): 'indirildi' {
  const a = doc()!.createElement('a');
  a.href = card.url;
  a.download = card.file?.name ?? 'yol.png';
  a.click();
  return 'indirildi';
}
