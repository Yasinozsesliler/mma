// Mağaza görselleri için hazır kayıtlar: Gençlik Yolu (12 yaş, yılın olayı) ve dövüş sporları ligi (maç hazır).
// Çalıştırma: npx tsx scripts/store-saves.ts <kariyer.json> <çıktı klasörü>
import { readFileSync, writeFileSync } from 'node:fs';
import { createGame, rollStartingStats } from '../src/engine/character';
import { setSeed } from '../src/engine/rng';
import { requestSportBout } from '../src/engine/sportLeague';
import { startYouth } from '../src/engine/youth';
import type { GameState } from '../src/engine/types';

const [kariyer, out] = process.argv.slice(2);
setSeed(7);
const input = { ad: 'Kerem', soyad: 'Aslan', lakap: 'Kobra', uyruk: 'tr', memleket: 'İstanbul', yas: 18, siklet: 'welter' as const, gecmis: 'muaythai' as const, hikaye: '', genclik: true };
const y = createGame(input, rollStartingStats(input));
startYouth(y);
writeFileSync(`${out}/genclik.json`, JSON.stringify(y));

const base = JSON.parse(readFileSync(kariyer, 'utf8')) as GameState;
const lig = structuredClone(base);
lig.phase = 'sporLig';
writeFileSync(`${out}/spor-lig.json`, JSON.stringify(lig));
const mac = structuredClone(base);
mac.sporMac = undefined;
mac.sporDavet = undefined;
requestSportBout(mac, 'muaythai');
writeFileSync(`${out}/spor-mac.json`, JSON.stringify(mac));
console.log('genclik', y.phase, y.genclik?.spor, '| mac', mac.phase, mac.sporMac?.spor, mac.sporMac?.rakip.ad);
