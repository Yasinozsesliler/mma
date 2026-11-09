// Kamp anları: kamp kendiliğinden ilerlerken her kampta bir kez küçük bir karar gelir. Havuz geniştir ve son
// görülenler bir süre tekrar gelmez (variety.ts). Seçim kamp sonucuna küçük bir artı ya da eksi olarak yansır.
import { L, LOC } from '../i18n';
import { addFollowers, followers } from './fame';
import { chance, clamp } from './rng';
import type { GameState } from './types';
import { fresh, oneOf } from './variety';

export type CampMomentId =
  | 'darbe'
  | 'ekstra'
  | 'diyet'
  | 'roportaj'
  | 'misafir'
  | 'video'
  | 'irtifa'
  | 'dogumgunu'
  | 'influencer'
  | 'plan'
  | 'genc'
  | 'eski_sakatlik'
  | 'aile'
  | 'yeni_partner';
export interface CampMoment {
  id: CampMomentId;
  metin: string;
  secenekler: string[];
  sonuc?: string;
  kapandi?: boolean;
}
/** Kamp sonucuna etkiler */
export interface CampEffect {
  gelisim?: number;
  risk?: number;
  diyet?: boolean;
}

const fee = (s: GameState) => ({ amator: 200, bolgesel: 1_500, buyuk: 7_000, ufc: 25_000 })[s.stage];
const $ = (n: number) => `$${n.toLocaleString(LOC)}`;

export function maybeCampMoment(s: GameState) {
  const k = s.pending.kamp;
  if (!k || k.kampAn || k.kankaAn) return;
  const hoca = s.takim.antrenor;
  const rakip = s.pending.rakip?.soyad ?? L("rakibin");
  const pro = s.stage !== 'amator';
  const m: { id: CampMomentId; ok: boolean; metin: string; secenekler: string[] }[] = [
    { id: 'darbe', ok: true, metin: oneOf([L("Sparda sert bir darbe aldın; kaburgaların sızlıyor. {0} kararı sana bırakıyor.", [hoca]), L("Spar partnerinin dizi kaburgana oturdu. Nefes alırken batıyor.")]), secenekler: [L("Birkaç gün dinlen"), L("Dişini sık, devam et")] },
    { id: 'ekstra', ok: true, metin: oneOf([L("{0} kampın gidişatından memnun ve gece seansları eklemek istiyor.", [hoca]), L("{0}: “İyi gidiyoruz. Biraz daha zorlarsak zirveye çıkarız.”", [hoca])]), secenekler: [L("Ekstra seansı ekle"), L("Dinlenmeyi tercih et")] },
    { id: 'diyet', ok: true, metin: L("Diyetisyen tartıyı erken düşünmeni öneriyor: şimdiden kalori kesersen son 48 saat kolaylaşır."), secenekler: [L("Diyete şimdi başla"), L("Önce kampa odaklan")] },
    { id: 'roportaj', ok: pro, metin: L("Büyük bir spor kanalı kamptan röportaj istiyor. Bir gün sürer."), secenekler: [L("Röportajı ver"), L("Kampı koru")] },
    { id: 'misafir', ok: pro, metin: L("Ünlü bir antrenör bir haftalığına kampına katılabilir. Ücreti {0}.", [$(fee(s))]), secenekler: [L("Davet et ({0})", [$(fee(s))]), L("Gerek yok")] },
    { id: 'video', ok: true, metin: L("Rakibin {0} için yeni bir maç kaydı çıktı. Bütün gece izlersen bir açık bulabilirsin ama uykun kaçar.", [rakip]), secenekler: [L("Sabaha kadar izle"), L("Uykunu al, hocan izlesin")] },
    { id: 'irtifa', ok: pro, metin: L("Dağda bir irtifa kampı teklifi var: kondisyona çok iyi gelir ama pahalı ({0}).", [$(fee(s) * 2)]), secenekler: [L("Dağa çık ({0})", [$(fee(s) * 2)]), L("Salonda devam")] },
    { id: 'dogumgunu', ok: true, metin: oneOf([L("En yakın arkadaşının doğum günü partisi bu akşam. Herkes seni bekliyor."), L("Mahalleden arkadaşların bir düğüne çağırıyor. Bir gece için de olsa kafa dağıtırsın.")]), secenekler: [L("Kısa bir uğra, erken dön"), L("Gitme, kamptasın")] },
    { id: 'influencer', ok: pro, metin: L("Ünlü bir sosyal medya fenomeni kampta seninle video çekmek istiyor."), secenekler: [L("Çek, takipçi gelsin"), L("Kamp kapalı")] },
    { id: 'plan', ok: true, metin: L("{0} ile maç planı konusunda anlaşamadınız: o temkinli bir plan istiyor, sen daha agresif.", [hoca]), secenekler: [L("Hocanı dinle"), L("Kendi planını savun")] },
    { id: 'genc', ok: true, metin: L("Salonda bir genç seninle spar yapmak için yalvarıyor. Hevesli ama kontrolsüz."), secenekler: [L("Kabul et, ona yol göster"), L("Nazikçe reddet")] },
    { id: 'eski_sakatlik', ok: s.gecmis.length >= 4, metin: L("Eski bir sakatlığın sızlamaya başladı. Fizyoterapist bir hafta hafif çalışmanı öneriyor."), secenekler: [L("Hafif çalış"), L("Ağrı kesiciyle devam et")] },
    { id: 'aile', ok: true, metin: oneOf([L("Ailen kampı ziyaret etmek istiyor. Moral olur ama bir gün kaybedersin."), L("Annen bir tencere yemekle salona gelmiş. Diyetisyen dehşet içinde.")]), secenekler: [L("Kapıları aç"), L("Maçtan sonra görüşürüz")] },
    { id: 'yeni_partner', ok: pro, metin: L("Tarzı {0} ile birebir aynı olan bir spar partneri bulundu. Bir haftalığı {1}.", [rakip, $(Math.round(fee(s) * 0.6))]), secenekler: [L("Getir ({0})", [$(Math.round(fee(s) * 0.6))]), L("Kendi partnerlerimle yeter")] },
  ];
  const [a] = fresh(s, 'kamp_an', m.filter((x) => x.ok), 1, 9);
  if (a) k.kampAn = { id: a.id, metin: a.metin, secenekler: a.secenekler };
}

export function chooseCampMoment(s: GameState, i: number) {
  const k = s.pending.kamp;
  const a = k?.kampAn;
  if (!k || !a || a.sonuc) return;
  const e: CampEffect = { ...(k.anEtki ?? {}) };
  const g = (n: number) => (e.gelisim = (e.gelisim ?? 0) + n);
  const sag = (n: number) => (s.saglik = clamp(s.saglik + n, 0, 100));
  const mot = (n: number) => (s.motivasyon = clamp(s.motivasyon + n, -2, 2));
  const bag = (n: number) => s.hoca && (s.hoca.bag = clamp(s.hoca.bag + n, 0, 100));
  switch (a.id) {
    case 'darbe':
      if (i === 0) {
        g(-0.08);
        a.sonuc = oneOf([L("İki gün buz ve masaj. Biraz yavaşladın ama vücudun teşekkür ediyor."), L("Dinlendin; kaburgaların toparlandı ama bir iki seans kaçtı.")]);
      } else {
        e.risk = (e.risk ?? 0) + 0.4;
        a.sonuc = oneOf([L("Devam ettin. Hocan seni izliyor; bir şey olursa erken fark edecek."), L("Ağrıya rağmen sürdün. Riskli ama kamp aksamadı.")]);
      }
      break;
    case 'ekstra':
      if (i === 0) {
        g(0.12);
        sag(-6);
        a.sonuc = L("Gece seansları zorladı ama verimli geçti (sağlık -6).");
      } else {
        sag(4);
        a.sonuc = L("Dinlenmeyi seçtin; enerjin yerinde (sağlık +4).");
      }
      break;
    case 'diyet':
      if (i === 0) {
        e.diyet = true;
        mot(-1);
        a.sonuc = L("Tabağın küçüldü, keyfin biraz kaçtı (motivasyon -1) ama tartı haftası daha rahat geçecek.");
      } else a.sonuc = L("Kilo işini son haftaya bıraktın.");
      break;
    case 'roportaj':
      if (i === 0) {
        s.populerlik = clamp(s.populerlik + 2, 0, 100);
        g(-0.04);
        a.sonuc = L("Röportaj çok izlendi (popülerlik +2); bir antrenman günü kaçtı.");
      } else a.sonuc = L("Kapıyı kapattın, odak tamamen kampta.");
      break;
    case 'misafir':
      if (i === 0) {
        s.para -= fee(s);
        g(0.15);
        a.sonuc = L("Misafir antrenör bir haftada kafanda yeni kapılar açtı. Kamp daha verimli.");
      } else a.sonuc = L("Kendi ekibinle devam ettin.");
      break;
    case 'video':
      if (i === 0) {
        if (chance(0.6)) {
          g(0.1);
          a.sonuc = L("Sabaha karşı buldun: sol kroşeden önce omzunu düşürüyor. Bunu hocana gösterdin.");
        } else {
          sag(-3);
          a.sonuc = L("Saatlerce izledin ama yeni bir şey çıkmadı; ertesi gün uykusuzdun (sağlık -3).");
        }
      } else {
        bag(2);
        a.sonuc = L("Hocan kaydı izledi ve sabah sana üç not verdi. Güvenin arttı.");
      }
      break;
    case 'irtifa':
      if (i === 0) {
        s.para -= fee(s) * 2;
        g(0.14);
        sag(-2);
        a.sonuc = L("Dağda nefesin açıldı. Salona döndüğünde herkesten hızlı koşuyordun.");
      } else a.sonuc = L("Salonda devam ettin; tanıdık ortam, tanıdık yorgunluk.");
      break;
    case 'dogumgunu':
      if (i === 0) {
        mot(1);
        if (chance(0.25)) {
          e.risk = (e.risk ?? 0) + 0.2;
          a.sonuc = L("Erken dönecektin ama gece uzadı. Ertesi sabah antrenman zor geçti.");
        } else a.sonuc = L("Bir saat uğradın, güldün, erken döndün. Kafan dağıldı (motivasyon +1).");
      } else {
        a.sonuc = oneOf([L("Arkadaşların anlayış gösterdi: “Kemeri getir, partiyi sen ver.”"), L("Evde kaldın. Biraz buruk ama odaklısın.")]);
      }
      break;
    case 'influencer':
      if (i === 0) {
        addFollowers(s, Math.max(400, followers(s) * 0.04));
        g(-0.05);
        a.sonuc = L("Video milyonlarca izlendi; takipçin arttı ama yarım gün kayboldu.");
      } else a.sonuc = L("Kapıyı kapattın. Fenomen biraz bozuldu ama kamp seninle.");
      break;
    case 'plan':
      if (i === 0) {
        bag(4);
        g(0.04);
        a.sonuc = L("Hocanın planına güvendin. Aranız her zamankinden iyi.");
      } else if (chance(0.5)) {
        bag(-2);
        g(0.08);
        a.sonuc = L("Planını savundun; hocan ikna oldu ve kamp sana göre şekillendi.");
      } else {
        bag(-5);
        a.sonuc = L("Tartışma uzadı. Hocan sustu ama kırıldı.");
      }
      break;
    case 'genc':
      if (i === 0) {
        s.populerlik = clamp(s.populerlik + 1, 0, 100);
        if (chance(0.2)) {
          e.risk = (e.risk ?? 0) + 0.25;
          a.sonuc = L("Genç çok hırslıydı; kontrolsüz bir dirsek kaşını sıyırdı. Yine de iyi bir ders oldu.");
        } else a.sonuc = L("Gence birkaç şey öğrettin; salon seni bir rol model olarak görmeye başladı.");
      } else a.sonuc = L("Nazikçe reddettin; genç anlayışla karşıladı.");
      break;
    case 'eski_sakatlik':
      if (i === 0) {
        g(-0.06);
        sag(5);
        a.sonuc = L("Bir hafta hafif çalıştın; sızı geçti (sağlık +5).");
      } else {
        e.risk = (e.risk ?? 0) + 0.35;
        a.sonuc = L("Ağrı kesicilerle devam ettin. Kamp aksamadı ama vücudun not aldı.");
      }
      break;
    case 'aile':
      if (i === 0) {
        mot(1);
        g(-0.03);
        a.sonuc = oneOf([L("Ailenle geçen bir gün pil gibi şarj etti (motivasyon +1)."), L("Annenin yemeği diyete biraz zarar verdi ama moralin tavan.")]);
      } else a.sonuc = L("Ailen anlayış gösterdi: “Kafeste görüşürüz.”");
      break;
    case 'yeni_partner':
      if (i === 0) {
        s.para -= Math.round(fee(s) * 0.6);
        g(0.1);
        a.sonuc = L("Rakibinin kopyasıyla bir hafta: onun ritmine alıştın.");
      } else a.sonuc = L("Kendi partnerlerinle devam ettin.");
      break;
  }
  k.anEtki = e;
}

export function closeCampMoment(s: GameState) {
  const a = s.pending.kamp?.kampAn;
  if (a?.sonuc) a.kapandi = true;
}
export const campMomentOpen = (s: GameState) => {
  const a = s.pending.kamp?.kampAn;
  return !!a && !a.kapandi;
};
