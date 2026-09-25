// Takım yönetimi: salon/antrenör ve menajer değişiklikleri.
import { L, LOC } from '../i18n';
import { AGENTS } from './data';
import { gymById, gymsFor, type Gym } from './gyms';
import type { GameState } from './types';

const money = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

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
  if (!gym) return L("Salon bulunamadı.");
  if (s.takim.salonId === id) return L("Zaten bu salondasın.");
  if (s.para < gym.imza) return L("Paran yetmiyor. Geçiş ücreti {0}.", [money(gym.imza)]);
  const eski = s.takim.antrenor;
  s.para -= gym.imza;
  applyGym(s, gym);
  s.haberler.unshift(L("🥋 {0} {1}, {2} ile yollarını ayırıp {3} takımına katıldı.", [s.fighter.ad, s.fighter.soyad, eski, gym.salon]));
  return L("{0} artık yeni evin. {1}: “Burada tembelliğe yer yok.”", [gym.salon, gym.antrenor]);
}

/** Menajerler popülerliğe göre kapını çalar. */
export function agentUnlocked(s: GameState, kalite: number) {
  return kalite <= 3 + Math.floor(s.populerlik / 12);
}

export const agentSigning = (kalite: number) => kalite * kalite * 150;
export const agentSeverance = (s: GameState) => s.takim.menajerKalite * 800;

export function hireAgent(s: GameState, ad: string): string {
  const a = AGENTS.find((x) => x.ad === ad);
  if (!a) return L("Menajer bulunamadı.");
  if (!agentUnlocked(s, a.kalite)) return L("{0} seninle çalışmak için daha ünlü olmanı bekliyor.", [a.ad]);
  if (s.takim.menajer) return L("Önce mevcut menajerinle yollarını ayırmalısın.");
  const fee = agentSigning(a.kalite);
  if (s.para < fee) return L("İmza ücreti {0}. Paran yetmiyor.", [money(fee)]);
  s.para -= fee;
  s.takim.menajer = a.ad;
  s.takim.menajerKalite = a.kalite;
  s.takim.menajerPay = a.pay;
  s.haberler.unshift(L("🤝 {0}, {1} dövüşçüsünü temsil etmeye başladı.", [a.ad, s.fighter.soyad]));
  return L("{0} ile anlaştın. Kazançlarının %{1}’ı onun, ama pazarlıklar artık çok daha kolay.", [a.ad, Math.round(a.pay * 100)]);
}

export function fireAgent(s: GameState): string {
  if (!s.takim.menajer) return L("Zaten menajerin yok.");
  const fee = agentSeverance(s);
  const ad = s.takim.menajer;
  s.para -= fee;
  s.takim.menajer = null;
  s.takim.menajerKalite = 0;
  s.takim.menajerPay = 0;
  s.haberler.unshift(L("✂️ {0}, menajeri {1} ile yollarını ayırdı.", [s.fighter.soyad, ad]));
  return L("{0} ile yollarını ayırdın. Tazminat: {1}.", [ad, money(fee)]);
}
