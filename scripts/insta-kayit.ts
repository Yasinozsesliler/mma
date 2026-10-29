// Instagram modu fragmanı için kayıt: zengin kariyer kaydına oyunun kendi motoruyla birkaç aylık sosyal medya geçmişi ekler
// (fotoğraf ızgarası, akış gönderileri, mesaj kutusu). Son hafta fotoğraf hakkı boş bırakılır: videoda canlı paylaşım yapılır.
// Çalıştırma: npx tsx scripts/insta-kayit.ts <zengin.json> <çıktı.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { advanceWeeks } from '../src/engine/character';
import { dmAfterFight, dmCampStart, dmTick, dmUnread } from '../src/engine/dm';
import { followers } from '../src/engine/fame';
import { sharePhoto, type PhotoKind } from '../src/engine/gram';
import { generateOpponent } from '../src/engine/opponents';
import { setSeed } from '../src/engine/rng';
import { socialAfterFight, socialTick } from '../src/engine/social';
import type { GameState } from '../src/engine/types';

setSeed(11);
const [IN, OUT] = process.argv.slice(2);
const s = JSON.parse(readFileSync(IN, 'utf8')) as GameState;
s.takipci = Math.max(s.takipci ?? 0, 1_400_000);
s.envanter = [...new Set([...(s.envanter ?? []), 'araba2'])];
const KINDS: PhotoKind[] = ['antrenman', 'zafer', 'luks', 'taraftar', 'aile', 'afis', 'antrenman', 'sponsor', 'kemer', 'luks', 'zafer', 'taraftar'];
for (let w = 0; w < 24; w++) {
  advanceWeeks(s, 1);
  socialTick(s, 1);
  dmTick(s, 1);
  if (w % 6 === 2) {
    const o = generateOpponent(s, { zorluk: 0, org: 'ufc' });
    s.rakipler.push(o);
    s.pending.rakip = o;
    s.pending.kamp = { hafta: 6, hype: 40 } as GameState['pending']['kamp'];
    dmCampStart(s);
    s.pending.kamp = undefined;
    s.gecmis.unshift({ rakip: `${o.ad} ${o.soyad}`, rakipId: o.id, org: 'ufc', sonuc: 'G', yontem: 'KO', raunt: 2, yas: s.fighter.yas });
    s.sonMacHafta = s.hafta;
    socialAfterFight(s, o, true, false, 'KO', []);
    dmAfterFight(s, { o, won: true, draw: false, finish: true, title: w > 15 });
    s.pending.rakip = undefined;
  }
  // Son hafta boş: videoda canlı paylaşım
  if (w < 23) sharePhoto(s, KINDS[w % KINDS.length], { pro: w % 3 === 0, filtre: w % 4 });
}
delete s.kriz;
s.phase = 'sosyal';
s.pending = {};
writeFileSync(OUT, JSON.stringify(s));
console.log('✅ foto', s.foto?.liste.length, '· gönderi', s.sosyal?.length, '· DM', s.dm?.liste.length, `(okunmamış ${dmUnread(s)})`, '· takipçi', followers(s));
