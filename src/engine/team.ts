// Takım yönetimi: salon/antrenör ve menajer değişiklikleri.
import { AGENTS } from './data';
import { gymById, gymsFor, type Gym } from './gyms';
import type { GameState } from './types';

const money = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;

/** Ülkendeki salonlar + profesyonel olunca dünya çapındaki elit salonlar. */
export function availableGyms(s: GameState): Gym[] {
  const list = [...gymsFor(s.fighter.uyruk), ...(s.stage !== 'amator' ? gymsFor('elit') : [])];
  return list.sort((a, b) => a.kalite - b.kalite);
}

export function applyGym(s: GameState, gym: Gym) {
  s.takim.salonId = gym.id;
  s.takim.salon = gym.salon;
  s.takim.antrenor = gym.antrenor;
  s.takim.antrenorKalite = gym.kalite;
  s.takim.uzmanlik = gym.uzmanlik;
}

export function switchGym(s: GameState, id: string): string {
  const gym = gymById(id);
  if (!gym) return 'Salon bulunamadı.';
  if (s.takim.salonId === id) return 'Zaten bu salondasın.';
  if (s.para < gym.imza) return `Paran yetmiyor. Geçiş ücreti ${money(gym.imza)}.`;
  const eski = s.takim.antrenor;
  s.para -= gym.imza;
  applyGym(s, gym);
  s.haberler.unshift(`🥋 ${s.fighter.ad} ${s.fighter.soyad}, ${eski} ile yollarını ayırıp ${gym.salon} takımına katıldı.`);
  return `${gym.salon} artık yeni evin. ${gym.antrenor}: “Burada tembelliğe yer yok.”`;
}

/** Menajerler popülerliğe göre kapını çalar. */
export function agentUnlocked(s: GameState, kalite: number) {
  return kalite <= 3 + Math.floor(s.populerlik / 12);
}

export const agentSigning = (kalite: number) => kalite * kalite * 150;
export const agentSeverance = (s: GameState) => s.takim.menajerKalite * 800;

export function hireAgent(s: GameState, ad: string): string {
  const a = AGENTS.find((x) => x.ad === ad);
  if (!a) return 'Menajer bulunamadı.';
  if (!agentUnlocked(s, a.kalite)) return `${a.ad} seninle çalışmak için daha ünlü olmanı bekliyor.`;
  if (s.takim.menajer) return 'Önce mevcut menajerinle yollarını ayırmalısın.';
  const fee = agentSigning(a.kalite);
  if (s.para < fee) return `İmza ücreti ${money(fee)}. Paran yetmiyor.`;
  s.para -= fee;
  s.takim.menajer = a.ad;
  s.takim.menajerKalite = a.kalite;
  s.takim.menajerPay = a.pay;
  s.haberler.unshift(`🤝 ${a.ad}, ${s.fighter.soyad} dövüşçüsünü temsil etmeye başladı.`);
  return `${a.ad} ile anlaştın. Kazançlarının %${Math.round(a.pay * 100)}’ı onun, ama pazarlıklar artık çok daha kolay.`;
}

export function fireAgent(s: GameState): string {
  if (!s.takim.menajer) return 'Zaten menajerin yok.';
  const fee = agentSeverance(s);
  const ad = s.takim.menajer;
  s.para -= fee;
  s.takim.menajer = null;
  s.takim.menajerKalite = 0;
  s.takim.menajerPay = 0;
  s.haberler.unshift(`✂️ ${s.fighter.soyad}, menajeri ${ad} ile yollarını ayırdı.`);
  return `${ad} ile yollarını ayırdın. Tazminat: ${money(fee)}.`;
}
