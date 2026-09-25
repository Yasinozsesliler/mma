// Organizasyon sahipleri: dövüşlerden sonra ya da rastgele zamanlarda oyuncuya ulaşır.
// Sahiple ilişki: pazarlıkları kolaylaştırır, kötü gecelerde kovulmaktan korur.
import { currentOrg } from './character';
import { rankedOpponent } from './division';
import { chance, clamp, pick, randInt } from './rng';
import type { GameState, OrgId } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;

export interface Owner {
  ad: string;
  unvan: string;
  uyruk: string;
  tarz: string;
}

export const OWNERS: Partial<Record<OrgId, Owner>> = {
  cfc: { ad: 'Ron Castillo', unvan: 'Cage Fury FC sahibi', uyruk: 'ABD', tarz: 'Sert ama adil. Savaşçıları sever.' },
  oktagon: { ad: 'Pavel Horák', unvan: 'Oktagon MMA kurucusu', uyruk: 'Çekya', tarz: 'Şovmen. Stadyumları doldurmak ister.' },
  pfl: { ad: 'Richard Kessler', unvan: 'PFL CEO’su', uyruk: 'ABD', tarz: 'Kurumsal ve hesapçı.' },
  one: { ad: 'Kenji Takamura', unvan: 'ONE Championship başkanı', uyruk: 'Japonya', tarz: 'Saygı ve disiplin ister. Trash talk’tan hoşlanmaz.' },
  mvp: { ad: 'Logan Pierce', unvan: 'MVP MMA kurucusu', uyruk: 'ABD', tarz: 'Show her şeydir. Para konuşur.' },
  ufc: { ad: 'Dana White', unvan: 'UFC Başkanı', uyruk: 'ABD', tarz: 'Bitirişleri sever, bahaneleri sevmez.' },
  dwcs: { ad: 'Dana White', unvan: 'UFC Başkanı', uyruk: 'ABD', tarz: 'Bitirişleri sever, bahaneleri sevmez.' },
};

export const ownerOf = (s: GameState) => OWNERS[currentOrg(s)];
export const ownerRel = (s: GameState, org: OrgId = currentOrg(s)) => s.patron?.[org] ?? 0;

export function addRel(s: GameState, d: number) {
  const org = currentOrg(s);
  s.patron = s.patron ?? {};
  s.patron[org] = clamp((s.patron[org] ?? 0) + d, -50, 50);
  return d;
}
const relTxt = (d: number) => ` (Patronla ilişki ${d > 0 ? '+' : ''}${d})`;
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
        baslik: `📞 ${o.ad} arıyor`,
        metin: `${o.unvan} ${o.ad}: “${pick(['Muhteşem bir performanstı evlat!', 'İşte benim istediğim dövüş buydu!', 'Salon hâlâ seni konuşuyor.'])} Sana özel ${$(bonus)} bonus gönderiyorum.”`,
        secenekler: ['Teşekkür et', 'Daha büyük bir maç iste', 'Maaş zammı iste'],
        params: { bonus },
      };
    },
    uygula: (s, i, p) => {
      s.para += Number(p.bonus);
      if (i === 0) return `Bonusu aldın ve içtenlikle teşekkür ettin. +${$(Number(p.bonus))}` + relTxt(addRel(s, 5));
      if (i === 1) {
        const r = s.rank ? rankedOpponent(s, Math.max(1, s.rank - 3)) : null;
        if (r) s.cagri = r.id;
        return `“Hırsını seviyorum. ${r ? `${r.ad} ${r.soyad} ile seni eşleştirmeyi düşüneceğim.` : 'Bakalım neler yapabiliriz.'}” +${$(Number(p.bonus))}` + relTxt(addRel(s, 1));
      }
      if (s.contract && chance(0.3 + ownerRel(s) / 100 + s.populerlik / 300)) {
        s.contract.ucret = Math.round((s.contract.ucret * 1.15) / 100) * 100;
        return `“Hak ettin.” Dövüş başı ücretin %15 arttı: ${$(s.contract.ucret)}. +${$(Number(p.bonus))}` + relTxt(addRel(s, -1));
      }
      return `“Bonusla yetin evlat. Zam, kontrat masasında konuşulur.” +${$(Number(p.bonus))}` + relTxt(addRel(s, -3));
    },
  },
  patron_uyari: {
    kosul: (s) => pro(s) && s.seri <= -2,
    agirlik: 0,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: `📞 ${o.ad}: “Konuşmamız lazım.”`,
        metin: `${o.ad}: “Son iki maç kabul edilemez. Sana inanıyorum ama sabrım sınırsız değil. Bir yenilgi daha olursa yollarımızı ayırmak zorunda kalabilirim.”`,
        secenekler: ['Söz veriyorum, döneceğim', 'Kampımı baştan kuracağım', 'Bana saygı göster!'],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        s.motivasyon = 2;
        return '“Sözünü tut.” Telefonu kapattıktan sonra salona koştun. (Motivasyon tam)' + relTxt(addRel(s, 3));
      }
      if (i === 1) {
        s.motivasyon = Math.min(2, s.motivasyon + 1);
        return '“Doğru adım.” Patron yaklaşımını beğendi.' + relTxt(addRel(s, 5));
      }
      if (chance(0.3) && s.contract) {
        s.contract.kalan = 1;
        return '“Öyle mi? Bu kontratın son maçı olsun o zaman.” Kontratında sadece 1 dövüş kaldı!' + relTxt(addRel(s, -15));
      }
      return '“Saygı kazanılır.” Telefonu yüzüne kapattı.' + relTxt(addRel(s, -10));
    },
  },
  patron_kisa_haber: {
    kosul: (s) => pro(s) && !s.kisaHaber && s.saglik >= 70 && !s.sakatliklar.length,
    agirlik: 0.8,
    kur: (s) => {
      const o = ownerOf(s)!;
      const bonus = Math.round(((s.contract?.ucret ?? 5000) * 0.5) / 100) * 100;
      return {
        baslik: `📞 ${o.ad}: Acil durum!`,
        metin: `${o.ad}: “Ana karttaki dövüşçülerden biri sakatlandı. 3 hafta sonra kafese girebilir misin? Kabul edersen normal ücretine ek ${$(bonus)} veririm ve bunu unutmam.”`,
        secenekler: ['Kabul et, hazırım', 'Kampsız dövüşmem, reddet'],
        params: { bonus },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.kisaHaber = true;
        s.para += Number(p.bonus);
        return `“İşte savaşçı!” Kısa haber primi +${$(Number(p.bonus))}. Sıradaki dövüşün 3 haftalık kısa kampla gelecek.` + relTxt(addRel(s, 8));
      }
      return '“Anlıyorum… ama bunu hatırlayacağım.”' + relTxt(addRel(s, -4));
    },
  },
  patron_yemek: {
    kosul: (s) => pro(s),
    agirlik: 0.8,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: `🍽️ ${o.ad}’dan davet`,
        metin: `${o.unvan} ${o.ad} seni özel bir akşam yemeğine davet ediyor. ${o.tarz}`,
        secenekler: ['Katıl', 'Kibarca reddet'],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        popAdd(s, 1);
        return pick(['Uzun bir sohbet oldu. Organizasyonun geleceğinde senin yerin konuşuldu.', 'Patron sana gençliğinden hikâyeler anlattı. Aranızda güven oluştu.']) + ' (Popülerlik +1)' + relTxt(addRel(s, 7));
      }
      return 'Kampa odaklanman gerektiğini söyledin. Anlayışla karşıladı.' + relTxt(addRel(s, -1));
    },
  },
  patron_rakip: {
    kosul: (s) => pro(s) && !!s.bolum && s.rank != null && s.rank > 1,
    agirlik: 0.7,
    kur: (s) => {
      const o = ownerOf(s)!;
      const r = rankedOpponent(s, Math.max(1, (s.rank ?? 10) - randInt(1, 3)));
      return {
        baslik: `📞 ${o.ad}: “Bir maç fikrim var.”`,
        metin: `${o.ad}: “${r ? `${r.ad} “${r.lakap}” ${r.soyad} (#${r.rank}) ile dövüşmeni istiyorum.` : 'Sıklette yukarıdan biriyle dövüşmeni istiyorum.'} Taraftar bunu görmek istiyor. Var mısın?”`,
        secenekler: ['Varım!', 'Şimdi değil'],
        params: { id: r?.id ?? '' },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        if (p.id) s.cagri = String(p.id);
        return '“İşte bunu duymak istiyordum.” Maç masaya kondu.' + relTxt(addRel(s, 4));
      }
      return '“Tamam, ama fırsatlar beklemez.”' + relTxt(addRel(s, -3));
    },
  },
  patron_trash: {
    kosul: (s) => pro(s) && s.gecmis.length > 0 && (s.sosyal ?? []).some((x) => x.tur === 'oyuncu' && x.hafta >= s.hafta - 4),
    agirlik: 0.5,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: `📞 ${o.ad}: Sosyal medya`,
        metin: `${o.ad}: “Paylaşımlarını görüyorum. ${currentOrg(s) === 'one' ? 'Bizde saygı esastır, bu tavrı sevmiyorum.' : 'Biraz daha ateşli ol, bilet satsın!'}”`,
        secenekler: ['Haklısın, dikkat edeceğim', 'Ben böyleyim'],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0) return 'Patron memnun kaldı.' + relTxt(addRel(s, 3));
      if (currentOrg(s) === 'one') return '“O zaman kendi yolunu çiz.”' + relTxt(addRel(s, -6));
      popAdd(s, 2);
      return '“İşte bu! Bilet satıyorsun.” (Popülerlik +2)' + relTxt(addRel(s, 2));
    },
  },
  patron_uzatma: {
    kosul: (s) => pro(s) && ownerRel(s) >= 15 && (s.contract?.kalan ?? 0) <= 2 && (s.contract?.kalan ?? 0) > 0,
    agirlik: 1.2,
    kur: (s) => {
      const o = ownerOf(s)!;
      return {
        baslik: `📜 ${o.ad}: Erken uzatma`,
        metin: `${o.ad}: “Seninle uzun yola çıkmak istiyorum. Kontratını şimdiden 3 dövüş uzatalım, dövüş başı ücretine %20 zam.”`,
        secenekler: ['İmzala', 'Serbest piyasayı görmek istiyorum'],
        params: {},
      };
    },
    uygula: (s, i) => {
      if (i === 0 && s.contract) {
        s.contract.kalan += 3;
        s.contract.ucret = Math.round((s.contract.ucret * 1.2) / 100) * 100;
        s.contract.bonus = Math.round((s.contract.bonus * 1.2) / 100) * 100;
        return `İmzaladın! Yeni ücret ${$(s.contract.ucret)}, kalan ${s.contract.kalan} dövüş.` + relTxt(addRel(s, 6));
      }
      return '“Kapım açık, ama sonsuza kadar değil.”' + relTxt(addRel(s, -2));
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
