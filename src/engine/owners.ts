// Organizasyon sahipleri: dövüşlerden sonra ya da rastgele zamanlarda oyuncuya ulaşır.
// Sahiple ilişki: pazarlıkları kolaylaştırır, kötü gecelerde kovulmaktan korur.
import { L, LOC } from '../i18n';
import { currentOrg } from './character';
import { rankedOpponent } from './division';
import { chance, clamp, pick, randInt } from './rng';
import type { GameState, OrgId } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

export interface Owner {
  ad: string;
  unvan: string;
  uyruk: string;
  tarz: string;
}

export const OWNERS: Partial<Record<OrgId, Owner>> = {
  cfc: { ad: L("Ron Castillo"), unvan: L("Cage Force FC sahibi"), uyruk: 'ABD', tarz: L("Sert ama adil. Savaşçıları sever.") },
  oktagon: { ad: L("Pavel Horák"), unvan: L("Hexagon MMA kurucusu"), uyruk: L("Çekya"), tarz: L("Şovmen. Stadyumları doldurmak ister.") },
  pfl: { ad: L("Richard Kessler"), unvan: L("PFC CEO’su"), uyruk: 'ABD', tarz: L("Kurumsal ve hesapçı.") },
  one: { ad: L("Kenji Takamura"), unvan: L("ZEN Championship başkanı"), uyruk: L("Japonya"), tarz: L("Saygı ve disiplin ister. Trash talk’tan hoşlanmaz.") },
  mvp: { ad: L("Logan Pierce"), unvan: L("VIP MMA kurucusu"), uyruk: 'ABD', tarz: L("Show her şeydir. Para konuşur.") },
  ufc: { ad: L("Dean Wyatt"), unvan: L("UCC Başkanı"), uyruk: 'ABD', tarz: L("Bitirişleri sever, bahaneleri sevmez.") },
  dwcs: { ad: L("Dean Wyatt"), unvan: L("UCC Başkanı"), uyruk: 'ABD', tarz: L("Bitirişleri sever, bahaneleri sevmez.") },
};

export const ownerOf = (s: GameState) => OWNERS[currentOrg(s)];
export const ownerRel = (s: GameState, org: OrgId = currentOrg(s)) => s.patron?.[org] ?? 0;

export function addRel(s: GameState, d: number) {
  const org = currentOrg(s);
  s.patron = s.patron ?? {};
  s.patron[org] = clamp((s.patron[org] ?? 0) + d, -50, 50);
  return d;
}
const relTxt = (d: number) => L(" (Patronla ilişki {0}{1})", [d > 0 ? '+' : '', d]);
const popAdd = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));

type Params = Record<string, string | number>;
interface OwnerEvent {
  kosul: (s: GameState) => boolean;
  agirlik: number;
  kur: (s: GameState) => { baslik: string; metin: string; secenekler: string[]; params: Params };
  uygula: (s: GameState, i: number, p: Params) => string;
}

const pro = (s: GameState) => s.stage !== 'amator' && !!ownerOf(s) && !!s.contract;

export const OWNER_EVENTS: Record<string, OwnerEvent> = {
  patron_tebrik: {
    kosul: (s) => pro(s) && s.seri >= 1,
    agirlik: 0,
    kur: (s) => {
      const o = ownerOf(s)!;
      const bonus = Math.round(((s.contract?.ucret ?? 5000) * 0.3) / 100) * 100;
      return {
        baslik: L("📞 {0} arıyor", [o.ad]),
        metin: L("{0} {1}: “{2} Sana özel {3} bonus gönderiyorum.”", [o.unvan, o.ad, pick([L("Muhteşem bir performanstı evlat!"), L("İşte benim istediğim dövüş buydu!"), L("Salon hâlâ seni konuşuyor.")]), $(bonus)]),
        secenekler: [L("Teşekkür et"), L("Daha büyük bir maç iste"), L("Maaş zammı iste")],
        params: { bonus },
      };
    },
    uygula: (s, i, p) => {
      s.para += Number(p.bonus);
      if (i === 0) return L("Bonusu aldın ve içtenlikle teşekkür ettin. +{0}", [$(Number(p.bonus))]) + relTxt(addRel(s, 5));
      if (i === 1) {
        const r = s.rank ? rankedOpponent(s, Math.max(1, s.rank - 3)) : null;
        if (r) s.cagri = r.id;
        return L("“Hırsını seviyorum. {0}” +{1}", [r ? L("{0} {1} ile seni eşleştirmeyi düşüneceğim.", [r.ad, r.soyad]) : L("Bakalım neler yapabiliriz."), $(Number(p.bonus))]) + relTxt(addRel(s, 1));
      }
      if (s.contract && chance(0.3 + ownerRel(s) / 100 + s.populerlik / 300)) {
        s.contract.ucret = Math.round((s.contract.ucret * 1.15) / 100) * 100;
        return L("“Hak ettin.” Dövüş başı ücretin %15 arttı: {0}. +{1}", [$(s.contract.ucret), $(Number(p.bonus))]) + relTxt(addRel(s, -1));
      }
      return L("“Bonusla yetin evlat. Zam, kontrat masasında konuşulur.” +{0}", [$(Number(p.bonus))]) + relTxt(addRel(s, -3));
    },
  },
  patron_uyari: {
    kosul: (s) => pro(s) && s.seri <= -2,
    agirlik: 0,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: L("📞 {0}: “Konuşmamız lazım.”", [o.ad]),
        metin: L("{0}: “Son iki maç kabul edilemez. Sana inanıyorum ama sabrım sınırsız değil. Bir yenilgi daha olursa yollarımızı ayırmak zorunda kalabilirim.”", [o.ad]),
        secenekler: [L("Söz veriyorum, döneceğim"), L("Kampımı baştan kuracağım"), L("Bana saygı göster!")],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        s.motivasyon = 2;
        return L("“Sözünü tut.” Telefonu kapattıktan sonra salona koştun. (Motivasyon tam)") + relTxt(addRel(s, 3));
      }
      if (i === 1) {
        s.motivasyon = Math.min(2, s.motivasyon + 1);
        return L("“Doğru adım.” Patron yaklaşımını beğendi.") + relTxt(addRel(s, 5));
      }
      if (chance(0.3) && s.contract) {
        s.contract.kalan = 1;
        return L("“Öyle mi? Bu kontratın son maçı olsun o zaman.” Kontratında sadece 1 dövüş kaldı!") + relTxt(addRel(s, -15));
      }
      return L("“Saygı kazanılır.” Telefonu yüzüne kapattı.") + relTxt(addRel(s, -10));
    },
  },
  patron_kisa_haber: {
    kosul: (s) => pro(s) && !s.kisaHaber && s.saglik >= 70 && !s.sakatliklar.length,
    agirlik: 0.8,
    kur: (s) => {
      const o = ownerOf(s)!;
      const bonus = Math.round(((s.contract?.ucret ?? 5000) * 0.5) / 100) * 100;
      return {
        baslik: L("📞 {0}: Acil durum!", [o.ad]),
        metin: L("{0}: “Ana karttaki dövüşçülerden biri sakatlandı. 3 hafta sonra kafese girebilir misin? Kabul edersen normal ücretine ek {1} veririm ve bunu unutmam.”", [o.ad, $(bonus)]),
        secenekler: [L("Kabul et, hazırım"), L("Kampsız dövüşmem, reddet")],
        params: { bonus },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.kisaHaber = true;
        s.para += Number(p.bonus);
        return L("“İşte savaşçı!” Kısa haber primi +{0}. Sıradaki dövüşün 3 haftalık kısa kampla gelecek.", [$(Number(p.bonus))]) + relTxt(addRel(s, 8));
      }
      return L("“Anlıyorum… ama bunu hatırlayacağım.”") + relTxt(addRel(s, -4));
    },
  },
  patron_yemek: {
    kosul: (s) => pro(s),
    agirlik: 0.8,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: L("🍽️ {0}’dan davet", [o.ad]),
        metin: L("{0} {1} seni özel bir akşam yemeğine davet ediyor. {2}", [o.unvan, o.ad, o.tarz]),
        secenekler: [L("Katıl"), L("Kibarca reddet")],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        popAdd(s, 1);
        return pick([L("Uzun bir sohbet oldu. Organizasyonun geleceğinde senin yerin konuşuldu."), L("Patron sana gençliğinden hikâyeler anlattı. Aranızda güven oluştu.")]) + L(" (Popülerlik +1)") + relTxt(addRel(s, 7));
      }
      return L("Kampa odaklanman gerektiğini söyledin. Anlayışla karşıladı.") + relTxt(addRel(s, -1));
    },
  },
  patron_rakip: {
    kosul: (s) => pro(s) && !!s.bolum && s.rank != null && s.rank > 1,
    agirlik: 0.7,
    kur: (s) => {
      const o = ownerOf(s)!;
      const r = rankedOpponent(s, Math.max(1, (s.rank ?? 10) - randInt(1, 3)));
      return {
        baslik: L("📞 {0}: “Bir maç fikrim var.”", [o.ad]),
        metin: L("{0}: “{1} Taraftar bunu görmek istiyor. Var mısın?”", [o.ad, r ? L("{0} “{1}” {2} (#{3}) ile dövüşmeni istiyorum.", [r.ad, r.lakap, r.soyad, r.rank]) : L("Sıklette yukarıdan biriyle dövüşmeni istiyorum.")]),
        secenekler: [L("Varım!"), L("Şimdi değil")],
        params: { id: r?.id ?? '' },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        if (p.id) s.cagri = String(p.id);
        return L("“İşte bunu duymak istiyordum.” Maç masaya kondu.") + relTxt(addRel(s, 4));
      }
      return L("“Tamam, ama fırsatlar beklemez.”") + relTxt(addRel(s, -3));
    },
  },
  patron_trash: {
    kosul: (s) => pro(s) && s.gecmis.length > 0 && (s.sosyal ?? []).some((x) => x.tur === 'oyuncu' && x.hafta >= s.hafta - 4),
    agirlik: 0.5,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: L("📞 {0}: Sosyal medya", [o.ad]),
        metin: L("{0}: “Paylaşımlarını görüyorum. {1}”", [o.ad, currentOrg(s) === 'one' ? L("Bizde saygı esastır, bu tavrı sevmiyorum.") : L("Biraz daha ateşli ol, bilet satsın!")]),
        secenekler: [L("Haklısın, dikkat edeceğim"), L("Ben böyleyim")],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) return L("Patron memnun kaldı.") + relTxt(addRel(s, 3));
      if (currentOrg(s) === 'one') return L("“O zaman kendi yolunu çiz.”") + relTxt(addRel(s, -6));
      popAdd(s, 2);
      return L("“İşte bu! Bilet satıyorsun.” (Popülerlik +2)") + relTxt(addRel(s, 2));
    },
  },
  patron_uzatma: {
    kosul: (s) => pro(s) && ownerRel(s) >= 15 && (s.contract?.kalan ?? 0) <= 2 && (s.contract?.kalan ?? 0) > 0,
    agirlik: 1.2,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: L("📜 {0}: Erken uzatma", [o.ad]),
        metin: L("{0}: “Seninle uzun yola çıkmak istiyorum. Kontratını şimdiden 3 dövüş uzatalım, dövüş başı ücretine %20 zam.”", [o.ad]),
        secenekler: [L("İmzala"), L("Serbest piyasayı görmek istiyorum")],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0 && s.contract) {
        s.contract.kalan += 3;
        s.contract.ucret = Math.round((s.contract.ucret * 1.2) / 100) * 100;
        s.contract.bonus = Math.round((s.contract.bonus * 1.2) / 100) * 100;
        return L("İmzaladın! Yeni ücret {0}, kalan {1} dövüş.", [$(s.contract.ucret), s.contract.kalan]) + relTxt(addRel(s, 6));
      }
      return L("“Kapım açık, ama sonsuza kadar değil.”") + relTxt(addRel(s, -2));
    },
  },
};

/** Dövüş sonrası patron tepkisi: büyük galibiyetlerde tebrik, mağlubiyet serisinde uyarı. Olay açıldıysa true. */
export function ownerReaction(s: GameState, won: boolean, finish: boolean): string | null {
  if (!pro(s)) return null;
  if (s.seri <= -2 && chance(0.7)) return 'patron_uyari';
  if (won && (finish || s.sampiyon) && chance(0.45)) return 'patron_tebrik';
  return null;
}
