import { L, LANG, LOC } from '../i18n';
import { challengeWeight, CHALLENGES, DIFFICULTIES, type ChallengeId, type Difficulty } from '../engine/challenges';
import { HeritageBanner } from './DynastyPanel';
import type { Heritage } from '../engine/dynasty';
import { MONETIZATION, showRewarded, usePremium } from '../monetization';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { generateBackstory, growthMultiplier, rollStartingStats, type NewFighterInput } from '../engine/character';
import { BACKGROUNDS, COUNTRIES, femSurname, NAME_POOLS, NICKNAMES, WEIGHT_CLASSES, WEIGHT_MODS } from '../engine/data';
import { WOMEN_WEIGHTS } from '../engine/career';
import { gymsFor } from '../engine/gyms';
import type { Appearance } from '../engine/types';
import { BEARDS, BROWS, DEFAULT_LOOK, EYE_COLORS, EYE_SHAPES, FACE_SHAPES, FighterAvatar, HAIR_COLORS, HAIR_STYLES, LIPS, NOSES, SKIN_TONES } from './FighterAvatar';
import { START_POINTS } from '../engine/progression';
import type { Background, Stats, WeightClass } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Choice, Icon, OctIcon, P, Pill, Screen, Section, SLANT, Title, type IconName } from './components';
import { BASE_BOY, heightMods, heightOptions, lookFor } from '../engine/tale';
import { C, F, R } from './theme';

const STEPS = 9;

/** Dile göre varsayılan ülke: oyuncu kendi ülkesiyle başlasın. */
const LANG_COUNTRY: Record<string, string> = { tr: 'tr', en: 'us', es: 'mx', pt: 'br', ru: 'ru', pl: 'pl' };
const rnd = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

function randomName(uyruk: string, kadin = false) {
  const ulke = COUNTRIES[uyruk]?.ad ?? '';
  // ABD havuzunun etiketi çevrilmez ('ABD'); diğerleri ülke adıyla eşleşir.
  const pool = NAME_POOLS.find((p) => (uyruk === 'us' ? p.ulke === 'ABD' : ulke.startsWith(p.ulke))) ?? rnd(NAME_POOLS);
  // Lakap havuzu Türkçe; diğer dillerde lakabı oyuncu kendisi yazar.
  const soyad = rnd(pool.soyad);
  return { ad: rnd(kadin ? pool.kadin : pool.ad), soyad: kadin && pool.slav ? femSurname(soyad) : soyad, lakap: LANG === 'tr' ? rnd(NICKNAMES) : '' };
}

export function CreateScreen({
  onDone: onDoneRaw,
  onBack,
  heritage,
  challenge,
}: {
  onDone: (input: NewFighterInput, stats: Stats) => void;
  onBack: () => void;
  heritage?: Heritage | null;
  challenge?: ChallengeId | null;
}) {
  const ch = challenge ? CHALLENGES[challenge] : null;
  const [zorluk, setZorluk] = useState<Difficulty>(ch?.zorluk ?? 'normal');
  /** Meydan okuma kuralları (yaş, branş) ve zorluk karakter bitince uygulanır; değişen alan olursa istatistik yeniden atılır. */
  const onDone = (input: NewFighterInput, stats: Stats) => {
    const x: NewFighterInput = { ...input, zorluk, meydan: challenge ?? undefined };
    if (ch?.yas) x.yas = ch.yas;
    if (ch?.gecmis) x.gecmis = ch.gecmis;
    if (ch?.zorluk) x.zorluk = ch.zorluk;
    const w = challengeWeight(challenge, input.kadin);
    if (w) {
      x.siklet = w;
      x.boy = BASE_BOY[w];
    }
    onDoneRaw(x, x.yas !== input.yas || x.gecmis !== input.gecmis || x.siklet !== input.siklet ? rollStartingStats(x) : stats);
  };
  const [step, setStep] = useState(1);
  const startCountry = heritage?.uyruk ?? (COUNTRIES[LANG_COUNTRY[LANG]] ? LANG_COUNTRY[LANG] : 'tr');
  const [inp, setInp] = useState<NewFighterInput>({
    ad: heritage?.cocukAd ?? '',
    soyad: heritage?.soyad ?? '',
    lakap: '',
    uyruk: startCountry,
    memleket: heritage?.memleket ?? '',
    // Meydan okuma yaşı ya da branşı belirliyorsa baştan o değerle başlanır (o adım sorulmaz)
    yas: ch?.yas ?? 22,
    siklet: challengeWeight(challenge) ?? 'hafif',
    gecmis: ch?.gecmis ?? heritage?.gecmis ?? 'boks',
    hikaye: '',
    salonId: gymsFor(startCountry)[0].id,
    gorunum: { ...DEFAULT_LOOK },
  });
  /** Cinsiyet: kadın kariyerinde rakipler de kadın, sıkletler sinek-horoz-tüy; görünüm uyarlanır. */
  const setGender = (kadin: boolean) =>
    setInp((x) => {
      const siklet = challengeWeight(challenge, kadin) ?? (kadin && !WOMEN_WEIGHTS.includes(x.siklet) ? 'horoz' : x.siklet);
      const g = x.gorunum ?? DEFAULT_LOOK;
      return {
        ...x,
        kadin,
        siklet,
        boy: BASE_BOY[siklet],
        gorunum: kadin
          ? { ...g, kadin: true, sakal: 'yok', sac: g.sac === 'kisa' || g.sac === 'kazik' || g.sac === 'mohawk' || g.sac === 'kel' ? 'atkuyrugu' : g.sac, kulak: 0, kas: 0, dudak: 2 }
          : { ...g, kadin: undefined, sakal: g.sakal === 'yok' ? 'kirli' : g.sakal, sac: g.sac === 'atkuyrugu' ? 'kisa' : g.sac, kas: 1, dudak: 1 },
      };
    });
  /** Hızlı başla: kalan adımlar mantıklı/rastgele seçimlerle doldurulur ve kariyer hemen başlar. */
  const HOMETOWNS: Record<string, string[]> = {
    tr: [L("Erzurum"), L("Trabzon"), L("Adana"), L("Diyarbakır"), L("Samsun"), L("Konya"), L("İzmir")],
    us: ['Detroit', 'Philadelphia', 'Albuquerque', 'Sacramento'],
    br: ['Curitiba', 'Recife', 'Manaus', 'Salvador'],
    ru: [L("Mahaçkale"), L("Grozni"), L("Kazan"), L("Omsk")],
    gb: ['Liverpool', 'Glasgow', 'Leeds'],
    ie: ['Cork', 'Galway', 'Limerick'],
    fr: ['Marseille', 'Lyon', 'Lille'],
    de: ['Köln', 'Hamburg', 'Dortmund'],
    pl: ['Kraków', 'Gdańsk', 'Wrocław'],
    cz: ['Brno', 'Ostrava'],
    ge: [L("Tiflis"), L("Batum"), L("Kutaisi")],
    kz: [L("Almatı"), L("Şımkent"), L("Karaganda")],
    mx: ['Tijuana', 'Guadalajara', 'Monterrey'],
    jp: ['Osaka', 'Sapporo', 'Fukuoka'],
    ng: ['Lagos', 'Ibadan', 'Kano'],
    au: ['Brisbane', 'Melbourne', 'Adelaide'],
    az: [L("Gence"), L("Sumgayıt"), L("Şeki")],
  };
  const quickStart = () => {
    const name = randomName(inp.uyruk, !!inp.kadin);
    const siklet = challengeWeight(challenge, inp.kadin) ?? rnd<WeightClass>(inp.kadin ? WOMEN_WEIGHTS : ['tuy', 'hafif', 'welter', 'orta']);
    const x: NewFighterInput = {
      ...inp,
      ad: inp.ad.trim() || name.ad,
      soyad: inp.soyad.trim() || name.soyad,
      lakap: inp.lakap.trim() || (inp.ad.trim() ? '' : name.lakap),
      // Memleket boşsa ülkeye uygun bir şehir: memleket kartı ve memleket maçları açılsın
      memleket: inp.memleket.trim() || rnd(HOMETOWNS[inp.uyruk] ?? HOMETOWNS.tr),
      yas: ch?.yas ?? 22,
      siklet,
      boy: BASE_BOY[siklet],
      gecmis: heritage?.gecmis ?? rnd(Object.keys(BACKGROUNDS) as Background[]),
      gorunum: lookFor({ id: `oyuncu-${Date.now()}`, uyruk: COUNTRIES[inp.uyruk]?.ad ?? inp.uyruk, kadin: !!inp.kadin }),
    };
    x.hikaye = generateBackstory(x);
    onDone(x, rollStartingStats(x));
  };
  const [stats, setStats] = useState<Stats | null>(null);
  const [rerolls, setRerolls] = useState(2);
  const [bonusRolls, setBonusRolls] = useState(0);
  const premium = usePremium();
  const set = (p: Partial<NewFighterInput>) => setInp((x) => ({ ...x, ...p }));
  /** Meydan okumanın belirlediği adımlar atlanır: yaş (4), sıklet (5) ve dövüş geçmişi (6). */
  const skip = (n: number) => (n === 4 && !!ch?.yas) || (n === 5 && !!ch?.siklet) || (n === 6 && !!ch?.gecmis);
  const next = () => {
    let n = step + 1;
    while (skip(n)) n++;
    if (n === 9) setStats(rollStartingStats(inp));
    setStep(n);
  };
  const back = () => {
    if (step === 1) return onBack();
    let n = step - 1;
    while (n > 1 && skip(n)) n--;
    setStep(n);
  };

  const canNext = step !== 1 || (inp.ad.trim().length > 0 && inp.soyad.trim().length > 0);

  const footer = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button label={L("GERİ")} tone="ghost" onPress={back} />
      </View>
      <View style={{ flex: 2 }}>
        {step < STEPS ? (
          <Button label={L("DEVAM")} onPress={next} disabled={!canNext} />
        ) : (
          <Button label={L("KARİYERE BAŞLA")} tone="gold" onPress={() => stats && onDone(inp, stats)} />
        )}
      </View>
    </View>
  );

  return (
    <Screen footer={footer}>
      <Text style={cs.step}>{L("KARAKTER OLUŞTURMA ·")}{' '}{Math.min(step, 8)}/8</Text>

      {step === 1 && (
        <>
          <Title sub={L("Salonun yaşlı sahibi gözlüğünün üstünden bakıyor: “Buralarda seni daha önce görmedim. Kimsin sen, evlat?”")}>
            
            {L("Adın ne?")}
          </Title>
          {heritage ? <HeritageBanner h={heritage} /> : null}
          {ch ? (
            <View style={cs.challenge}>
              <Text style={cs.challengeKicker}>{L("MEYDAN OKUMA")}</Text>
              <Text style={cs.challengeName}>{ch.ad()}</Text>
              <Text style={cs.challengeDesc}>{ch.aciklama()}</Text>
            </View>
          ) : null}
          <Text style={cs.label}>{L("Zorluk")}</Text>
          <View style={[cs.genderRow, ch?.zorluk && { opacity: 0.5 }]} pointerEvents={ch?.zorluk ? 'none' : 'auto'}>
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
              const on = zorluk === d;
              return (
                <Pressable key={d} onPress={() => setZorluk(d)} style={[cs.gender, on && cs.genderOn]}>
                  <Text style={[cs.genderText, on && { color: '#000' }]}>{DIFFICULTIES[d].ad().toLocaleUpperCase(LOC)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[cs.challengeDesc, { marginBottom: 10 }]}>{DIFFICULTIES[zorluk].aciklama()}</Text>
          <View style={cs.genderRow}>
            {([false, true] as const).map((k) => {
              const on = !!inp.kadin === k;
              return (
                <Pressable key={String(k)} onPress={() => setGender(k)} style={[cs.gender, on && cs.genderOn]}>
                  <Icon name={k ? 'gender-female' : 'gender-male'} size={18} color={on ? '#000' : C.dim} />
                  <Text style={[cs.genderText, on && { color: '#000' }]}>{k ? L("KADIN") : L("ERKEK")}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label={L("Ad")} value={inp.ad} onChange={(ad) => set({ ad })} />
          {heritage ? (
            <Text style={[cs.label, { marginBottom: 12 }]}>
              {L("Soyad")}: <Text style={{ color: C.gold }}>{inp.soyad}</Text>
            </Text>
          ) : (
            <Field label={L("Soyad")} value={inp.soyad} onChange={(soyad) => set({ soyad })} />
          )}
          <Field label={L("Lakap (isteğe bağlı)")} value={inp.lakap} onChange={(lakap) => set({ lakap })} placeholder={L("örn. Demir Yumruk")} />
          {!heritage ? (
            <Pressable onPress={() => set(randomName(inp.uyruk))} style={cs.dice} hitSlop={6}>
              <Icon name="dice-5" size={16} color={C.dim} />
              <Text style={cs.diceText}>{L("Rastgele isim")}</Text>
            </Pressable>
          ) : null}
          <LinearGradient colors={['#2a1d05', '#0c0d10']} style={cs.quick}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="lightning-bolt" size={20} color={C.gold} />
              <Text style={[cs.quickTitle, SLANT]}>{L("HIZLI BAŞLA")}</Text>
            </View>
            <Text style={cs.quickText}>{L("Kalan adımları biz seçelim: branş, sıklet, görünüm ve hikâye. Hemen salona gir, her şeyi sonradan oynarken öğrenirsin.")}</Text>
            <Button label={L("Hemen başla")} icon="lightning-bolt" tone="gold" onPress={quickStart} />
          </LinearGradient>
          <Text style={cs.orFull}>{L("ya da DEVAM ile karakterini adım adım kendin kur")}</Text>
        </>
      )}

      {step === 2 && (
        <>
          <Title sub={L("Uyruğun, antrenman imkânlarını ve taraftar desteğini belirler.")}>{L("Nerelisin?")}</Title>
          <Field label={L("Memleket (şehir)")} value={inp.memleket} onChange={(memleket) => set({ memleket })} placeholder={L("örn. Erzurum")} />
          {Object.entries(COUNTRIES).map(([k, c]) => (
            <Choice
              key={k}
              label={c.ad}
              desc={
                L("Antrenman {0} · Taraftar {1}", [dots(c.egitim), dots(c.taraftar)]) +
                (inp.uyruk === k
                  ? L("\n📊 İstatistik bonusu: +{0} · 🔥 Başlangıç popülerliği: {1}\n🥋 {2} salon seçeneği: {3}", [Math.round(c.egitim * 0.6), Math.round(c.taraftar * 1.2), gymsFor(k).length, gymsFor(k).map((g) => g.salon).join(', ')])
                  : '')
              }
              selected={inp.uyruk === k}
              tone="plain"
              onPress={() => set({ uyruk: k, salonId: gymsFor(k)[0]?.id })}
            />
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <Title sub={L("{0}’deki salonlar. Kaliteli salon daha hızlı geliştirir ama kamp ücretleri de yüksektir. Antrenörün uzmanlık alanına odaklanan kamplar %35 daha verimlidir.", [COUNTRIES[inp.uyruk].ad])}>
            
            {L("Salonunu seç")}
          </Title>
          {gymsFor(inp.uyruk).map((g) => {
            const sel = inp.salonId === g.id;
            return (
              <Pressable key={g.id} onPress={() => set({ salonId: g.id })} style={({ pressed }) => [cs.branch, { borderColor: sel ? C.red : C.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                <View style={[cs.branchStripe, { backgroundColor: sel ? C.red : C.border }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <OctIcon name="whistle" color={sel ? C.red : C.dim} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={[cs.branchTitle, SLANT, { fontSize: 18, color: sel ? C.red : C.text }]}>{g.salon.toLocaleUpperCase(LOC)}</Text>
                    <Text style={cs.branchDesc}>{g.antrenor}</Text>
                  </View>
                </View>
                <Text style={[cs.branchDesc, { marginTop: 8 }]}>{g.aciklama}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Pill text={L("Uzmanlık: {0}", [STAT_LABELS[g.uzmanlik]])} icon="target" color={C.gold} />
                  <Pill text={L("Kalite {0}/10", [g.kalite])} icon="star-four-points" color={g.kalite >= 5 ? C.green : C.dim} />
                  <Pill text={L("Profesyonel kamp: ${0}/hafta", [(g.kalite * 40).toLocaleString(LOC)])} icon="cash" color={C.dim} />
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {step === 4 && (
        <>
          <Title sub={L("Genç dövüşçü hızlı gelişir ama ham başlar. Yaşlı dövüşçü tecrübeli başlar ama zamanı azdır.")}>{L("Kaç yaşındasın?")}</Title>
          <View style={cs.ageGrid}>
            {Array.from({ length: 13 }, (_, i) => 18 + i).map((y) => (
              <Pressable key={y} onPress={() => set({ yas: y })} style={[cs.age, inp.yas === y && { borderColor: C.red, backgroundColor: C.redDim }]}>
                <Text style={cs.ageText}>{y}</Text>
              </Pressable>
            ))}
          </View>
          <Card>
            <P>{L("📈 Gelişim hızı: ×")}{growthMultiplier(inp.yas).toFixed(2)} {L("(kamp puanlarını ve gelişimi çarpar)")}</P>
            <P>{L("💪 Tecrübe bonusu: tüm istatistiklere +")}{Math.round((inp.yas - 18) * 0.45)}</P>
            <P>{L("⏳ Kariyer süresi: yaklaşık")}{' '}{41 - inp.yas} {L("yıl. 32 yaştan sonra hız ve çene düşer.")}</P>
            <P dim>
              {inp.yas <= 22
                ? L("Sünger gibisin. Her kamp seni ileri taşır, ama ilk maçlarda tecrübesizlik ödetir.")
                : inp.yas <= 26
                  ? L("Altın yaş. Hem gelişecek zamanın hem de temel bir olgunluğun var.")
                  : L("Olgun bir başlangıç. Daha güçlü başlarsın, ama saat tıkırdıyor.")}
            </P>
          </Card>
        </>
      )}

      {step === 5 && (
        <>
          <Title sub={L("Hafif sıkletler hızlı ve dayanıklıdır, ağır sıkletler tek yumrukla bitirir.")}>{L("Hangi sıklette dövüşeceksin?")}</Title>
          {(inp.kadin ? WOMEN_WEIGHTS : (Object.keys(WEIGHT_CLASSES) as WeightClass[])).map((w) => (
            <Choice
              key={w}
              label={L("{0} Sıklet", [WEIGHT_CLASSES[w].ad])}
              desc={L("{0} kg · {1} lb\n{2}", [WEIGHT_CLASSES[w].kg, WEIGHT_CLASSES[w].lb, modText(WEIGHT_MODS[w]) || L("Dengeli: etki yok")])}
              selected={inp.siklet === w}
              tone="plain"
              onPress={() => set({ siklet: w, boy: BASE_BOY[w] })}
            />
          ))}
          <Section>{L("BOYUN")}</Section>
          <Text style={cs.heightHint}>{L("Bir kez seçilir, kariyer boyunca değişmez. Uzun boy uzanma (vuruş), kısa boy düşük ağırlık merkezi (güreş) getirir.")}</Text>
          <View style={cs.heights}>
            {heightOptions(inp.siklet).map((h) => {
              const on = (inp.boy ?? BASE_BOY[inp.siklet]) === h;
              const m = heightMods(h, inp.siklet);
              return (
                <Pressable key={h} onPress={() => set({ boy: h })} style={[cs.height, on && cs.heightOn]}>
                  <Text style={[cs.heightVal, on && { color: '#fff' }]}>{h}</Text>
                  <Text style={[cs.heightUnit, on && { color: '#fff' }]}>cm</Text>
                  <Text style={[cs.heightMod, on && { color: '#fff' }]}>{m.vurus ? L("{0}{1} Vuruş\n{2}{3} Güreş", [m.vurus > 0 ? '+' : '', m.vurus, m.gures! > 0 ? '+' : '', m.gures]) : L("Dengeli")}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {step === 6 && (
        <>
          <Title sub={L("Güçlü ve zayıf yönlerini bu belirler.")}>{L("Dövüş geçmişin ne?")}</Title>
          {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
            <BranchCard key={b} b={b} selected={inp.gecmis === b} inp={inp} onPress={() => set({ gecmis: b })} />
          ))}
        </>
      )}

      {step === 7 && inp.gorunum && (
        <>
          <Title sub={L("Kafese girdiğinde herkes bu yüzü görecek.")}>{L("Görünümün")}</Title>
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <FighterAvatar look={inp.gorunum} size={170} />
            <Text style={[cs.branchTitle, SLANT, { marginTop: 8 }]}>
              {inp.ad.toLocaleUpperCase(LOC)} {inp.soyad.toLocaleUpperCase(LOC)}
            </Text>
          </View>
          <LookPicker look={inp.gorunum} onChange={(g) => set({ gorunum: g })} />
        </>
      )}

      {step === 8 && (
        <>
          <Title sub={L("Kendin yazabilir ya da senin için yazmamı isteyebilirsin.")}>{L("Hikâyen ne?")}</Title>
          <TextInput
            style={[cs.input, { minHeight: 160, textAlignVertical: 'top' }]}
            multiline
            value={inp.hikaye}
            onChangeText={(hikaye) => set({ hikaye })}
            placeholder={L("Nereden geliyorsun? Seni kafese ne getirdi?")}
            placeholderTextColor={C.faint}
          />
          <Button label={L("BENİM İÇİN YAZ")} tone="ghost" onPress={() => set({ hikaye: generateBackstory(inp) })} />
        </>
      )}

      {step === 9 && stats && (
        <>
          <Title sub={L("{0} · {1} Sıklet · {2} yaş · {3}", [BACKGROUNDS[inp.gecmis].ad, WEIGHT_CLASSES[inp.siklet].ad, inp.yas, COUNTRIES[inp.uyruk].ad])}>
            {inp.ad} {inp.lakap ? `"${inp.lakap}" ` : ''}
            {inp.soyad}
          </Title>
          <Card accent={C.gold}>
            {STAT_KEYS.map((k) => (
              <View key={k} style={cs.statRow}>
                <Text style={cs.statLabel}>{STAT_LABELS[k]}</Text>
                <View style={cs.statBar}>
                  <View style={[cs.statFill, { width: `${stats[k]}%` }]} />
                </View>
                <Text style={cs.statVal}>{stats[k]}</Text>
              </View>
            ))}
          </Card>
          {inp.hikaye ? <P dim>{inp.hikaye}</P> : null}
          <P dim>{L("⭐ Kariyere")}{' '}{START_POINTS} {L("gelişim puanıyla başlıyorsun. Kariyer ekranındaki GELİŞİM sekmesinden istediğin istatistiğe harcayabilirsin.")}</P>
          <Button
            label={L("ZARI YENİDEN AT ({0} hak)", [rerolls])}
            tone="ghost"
            disabled={rerolls <= 0}
            onPress={() => {
              setStats(rollStartingStats(inp));
              setRerolls(rerolls - 1);
            }}
          />
          {rerolls <= 0 && MONETIZATION && bonusRolls < 3 ? (
            <Button
              label={premium ? L("👑 Bir zar hakkı daha") : L("📺 Reklam izle: bir zar hakkı daha")}
              tone="gold"
              onPress={async () => {
                if ((await showRewarded()) === 'odul') {
                  setBonusRolls(bonusRolls + 1);
                  setRerolls(1);
                }
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const dots = (v: number) => '●'.repeat(Math.round(v / 2)) + '○'.repeat(5 - Math.round(v / 2));

function modText(mods: Partial<Stats>) {
  return (Object.entries(mods) as [keyof Stats, number][])
    .filter(([, v]) => v)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_LABELS[k]}`)
    .join(' · ');
}

function ModChips({ mods }: { mods: Partial<Stats> }) {
  const list = (Object.entries(mods) as [keyof Stats, number][]).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  return (
    <View style={cs.chips}>
      {list.map(([k, v]) => (
        <View key={k} style={[cs.chip, { borderColor: v > 0 ? C.green : C.red }]}>
          <Text style={[cs.chipText, { color: v > 0 ? C.green : C.red }]}>
            {v > 0 ? '+' : ''}
            {v} {STAT_LABELS[k]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Her branşın kendi renk kimliği ve ikonu. */
export const BRANCH_THEME: Record<Background, { color: string; icon: IconName }> = {
  boks: { color: '#e63946', icon: 'boxing-glove' },
  muaythai: { color: '#ff7b25', icon: 'fire' },
  kickboks: { color: '#ffd23f', icon: 'flash' },
  gures: { color: '#3a86ff', icon: 'arm-flex' },
  judo: { color: '#e9ecf5', icon: 'karate' },
  bjj: { color: '#9b5de5', icon: 'lock' },
  sambo: { color: '#c1121f', icon: 'paw' },
  kyokushin: { color: '#2ec4b6', icon: 'hand-back-right' },
  sokak: { color: '#8d99ae', icon: 'city-variant-outline' },
};

function BranchCard({ b, selected, inp, onPress }: { b: Background; selected: boolean; inp: NewFighterInput; onPress: () => void }) {
  const info = BACKGROUNDS[b];
  const th = BRANCH_THEME[b];
  const preview = selected ? rollStartingStats({ ...inp, gecmis: b }, false) : null;
  const zc = info.zorluk === L("Kolay") ? C.green : info.zorluk === L("Orta") ? C.gold : C.red;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cs.branch, { borderColor: selected ? th.color : C.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <LinearGradient
        colors={[th.color + (selected ? '40' : '1c'), 'rgba(20,22,27,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[cs.branchStripe, { backgroundColor: th.color }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <OctIcon name={th.icon} color={th.color} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[cs.branchTitle, SLANT, { color: selected ? th.color : C.text }]}>{info.ad.toLocaleUpperCase(LOC)}</Text>
          <Text style={cs.branchDesc}>{info.aciklama}</Text>
        </View>
        <Pill text={info.zorluk} color={zc} />
      </View>
      <ModChips mods={info.mods} />
      {selected && preview ? (
        <View style={cs.branchMore}>
          <Text style={[cs.branchDesc, { color: C.text }]}>{info.detay}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <Pill text={L("Güçlü: {0}", [info.guclu])} icon="arrow-up-bold-circle" color={C.green} />
            <Pill text={L("Zayıf: {0}", [info.zayif])} icon="alert-octagon" color={C.red} />
            <Pill text={`Plan: ${info.plan}`} icon="target" color={th.color} />
          </View>
          <Text style={[cs.label, { marginTop: 12 }]}>{L("SEÇİMLERİNLE BEKLENEN BAŞLANGIÇ (ZAR ±3)")}</Text>
          {STAT_KEYS.map((k) => (
            <View key={k} style={cs.statRow}>
              <Text style={[cs.statLabel, { width: 70, fontSize: 13 }]}>{STAT_LABELS[k]}</Text>
              <View style={cs.statBar}>
                <View style={[cs.statFill, { width: `${preview[k]}%`, backgroundColor: th.color }]} />
              </View>
              <Text style={cs.statVal}>{preview[k]}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <View style={cs.swatches}>
      {colors.map((c, i) => (
        <Pressable key={c} onPress={() => onPick(i)} style={[cs.swatch, { backgroundColor: c }, value === i && cs.swatchOn]} />
      ))}
    </View>
  );
}

function Chips<T extends string>({ items, value, onPick }: { items: { key: T; ad: string }[]; value: T; onPick: (k: T) => void }) {
  return (
    <View style={cs.chips}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={() => onPick(it.key)} style={[cs.lookChip, value === it.key && cs.lookChipOn]}>
          <Text style={[cs.lookChipText, value === it.key && { color: '#fff' }]}>{it.ad}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function LookPicker({ look, onChange }: { look: Appearance; onChange: (g: Appearance) => void }) {
  const set = (p: Partial<Appearance>) => onChange({ ...look, ...p });
  const rnd = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  return (
    <Card>
      <Text style={cs.label}>{L("TEN RENGİ")}</Text>
      <Swatches colors={SKIN_TONES} value={look.ten} onPick={(ten) => set({ ten })} />
      <Text style={cs.label}>{L("SAÇ MODELİ")}</Text>
      <Chips items={HAIR_STYLES} value={look.sac} onPick={(sac) => set({ sac })} />
      <Text style={cs.label}>{L("SAÇ RENGİ")}</Text>
      <Swatches colors={HAIR_COLORS} value={look.sacRenk} onPick={(sacRenk) => set({ sacRenk })} />
      <Text style={cs.label}>{L("GÖZ RENGİ")}</Text>
      <Swatches colors={EYE_COLORS} value={look.goz} onPick={(goz) => set({ goz })} />
      {!look.kadin ? (
        <>
          <Text style={cs.label}>{L("SAKAL")}</Text>
          <Chips items={BEARDS} value={look.sakal} onPick={(sakal) => set({ sakal })} />
        </>
      ) : null}
      <Text style={cs.label}>{L("YÜZ ŞEKLİ")}</Text>
      <Chips items={FACE_SHAPES} value={String(look.yuz ?? 0)} onPick={(k) => set({ yuz: Number(k) })} />
      <Text style={cs.label}>{L("GÖZLER")}</Text>
      <Chips items={EYE_SHAPES} value={String(look.gozSekil ?? 1)} onPick={(k) => set({ gozSekil: Number(k) })} />
      <Text style={cs.label}>{L("BURUN")}</Text>
      <Chips items={NOSES} value={String(look.burun ?? 0)} onPick={(k) => set({ burun: Number(k) })} />
      <Text style={cs.label}>{L("DUDAKLAR")}</Text>
      <Chips items={LIPS} value={String(look.dudak ?? 1)} onPick={(k) => set({ dudak: Number(k) })} />
      <Text style={cs.label}>{L("KAŞLAR")}</Text>
      <Chips items={BROWS} value={String(look.kas ?? 1)} onPick={(k) => set({ kas: Number(k) })} />
      <Text style={cs.label}>{L("DETAYLAR")}</Text>
      <Chips
        items={[
          { key: 'yara', ad: look.yara ? L("✓ Kaşta yara izi") : L("Kaşta yara izi") },
          { key: 'dovme', ad: look.dovme ? L("✓ Omuz dövmesi") : L("Omuz dövmesi") },
          { key: 'kulak', ad: look.kulak ? L("✓ Dövüşçü kulağı") : L("Dövüşçü kulağı") },
        ]}
        value={(look.yara ? 'yara' : '') as 'yara'}
        onPick={(k) => set(k === 'yara' ? { yara: !look.yara } : k === 'dovme' ? { dovme: !look.dovme } : { kulak: look.kulak ? 0 : 1 })}
      />
      <View style={{ marginTop: 12 }}>
        <Button
          label={L("Rastgele")}
          icon="dice-multiple"
          tone="ghost"
          onPress={() =>
            onChange({
              ten: Math.floor(Math.random() * SKIN_TONES.length),
              sac: rnd(HAIR_STYLES).key,
              sacRenk: Math.floor(Math.random() * HAIR_COLORS.length),
              goz: Math.floor(Math.random() * EYE_COLORS.length),
              sakal: rnd(BEARDS).key,
              yara: Math.random() < 0.25,
              dovme: Math.random() < 0.3,
              yuz: Math.floor(Math.random() * FACE_SHAPES.length),
              burun: Math.floor(Math.random() * NOSES.length),
              gozSekil: Math.floor(Math.random() * EYE_SHAPES.length),
              dudak: Math.floor(Math.random() * LIPS.length),
              kas: Math.floor(Math.random() * BROWS.length),
              kulak: Math.random() < 0.3 ? 1 : 0,
            })
          }
        />
      </View>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={cs.label}>{label}</Text>
      <TextInput style={cs.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} />
    </View>
  );
}

const cs = StyleSheet.create({
  challenge: { backgroundColor: '#2a0a0f', borderWidth: 1, borderColor: C.red, borderRadius: 12, padding: 12, gap: 2, marginBottom: 12 },
  challengeKicker: { color: C.red, fontFamily: F.semi, fontSize: 10, letterSpacing: 2 },
  challengeName: { color: C.text, fontFamily: F.display, fontSize: 17 },
  challengeDesc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  gender: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  genderOn: { backgroundColor: C.gold, borderColor: C.gold },
  genderText: { color: C.dim, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  dice: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, marginTop: -4, marginBottom: 14 },
  diceText: { color: C.dim, fontFamily: F.semi, fontSize: 13, textDecorationLine: 'underline' },
  quick: { borderWidth: 1, borderColor: C.goldDeep, borderRadius: 14, padding: 14, gap: 8 },
  quickTitle: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  quickText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  orFull: { color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginTop: 12 },
  heightHint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  heights: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  height: { flex: 1, alignItems: 'center', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10 },
  heightOn: { backgroundColor: C.red, borderColor: C.red },
  heightVal: { color: C.text, fontFamily: F.display, fontSize: 20 },
  heightUnit: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  heightMod: { color: C.dim, fontFamily: F.body, fontSize: 10, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 14 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#000' },
  swatchOn: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  lookChip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, transform: [{ skewX: '-8deg' }] },
  lookChipOn: { backgroundColor: C.red, borderColor: C.red },
  lookChipText: { color: C.dim, fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontFamily: F.bold },
  branch: { backgroundColor: C.card, borderRadius: R, borderWidth: 1.5, padding: 14, paddingLeft: 18, marginBottom: 10, overflow: 'hidden' },
  branchStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  branchMore: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  branchTitle: { color: C.text, fontSize: 22, fontFamily: F.display, letterSpacing: 0.5 },
  branchDesc: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  step: { color: C.red, fontSize: 12, fontFamily: F.black, letterSpacing: 1.5, marginBottom: 10 },
  label: { color: C.dim, fontFamily: F.body, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, color: C.text, padding: 14, fontFamily: F.body, fontSize: 16, marginBottom: 10 },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  age: { width: 56, height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  ageText: { color: C.text, fontSize: 17, fontFamily: F.bold },
  statRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 10 },
  statLabel: { color: C.dim, width: 78, fontFamily: F.body, fontSize: 14 },
  statBar: { flex: 1, height: 10, backgroundColor: C.cardAlt, borderRadius: 5, overflow: 'hidden' },
  statFill: { height: 10, backgroundColor: C.gold, borderRadius: 5 },
  statVal: { color: C.text, width: 28, textAlign: 'right', fontFamily: F.black, fontSize: 15 },
});
