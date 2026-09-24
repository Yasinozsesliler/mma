import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { generateBackstory, growthMultiplier, rollStartingStats, type NewFighterInput } from '../engine/character';
import { BACKGROUNDS, COUNTRIES, WEIGHT_CLASSES, WEIGHT_MODS } from '../engine/data';
import { gymsFor } from '../engine/gyms';
import type { Appearance } from '../engine/types';
import { BEARDS, DEFAULT_LOOK, EYE_COLORS, FighterAvatar, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from './FighterAvatar';
import { START_POINTS } from '../engine/progression';
import type { Background, Stats, WeightClass } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Choice, OctIcon, P, Pill, Screen, SLANT, Title, type IconName } from './components';
import { C, F, R } from './theme';

const STEPS = 9;

export function CreateScreen({ onDone, onBack }: { onDone: (input: NewFighterInput, stats: Stats) => void; onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [inp, setInp] = useState<NewFighterInput>({
    ad: '',
    soyad: '',
    lakap: '',
    uyruk: 'tr',
    memleket: '',
    yas: 22,
    siklet: 'hafif',
    gecmis: 'boks',
    hikaye: '',
    salonId: gymsFor('tr')[0].id,
    gorunum: { ...DEFAULT_LOOK },
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [rerolls, setRerolls] = useState(2);
  const set = (p: Partial<NewFighterInput>) => setInp((x) => ({ ...x, ...p }));
  const next = () => {
    if (step === 8) setStats(rollStartingStats(inp));
    setStep(step + 1);
  };
  const back = () => (step === 1 ? onBack() : setStep(step - 1));

  const canNext = step !== 1 || (inp.ad.trim().length > 0 && inp.soyad.trim().length > 0);

  const footer = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button label="GERİ" tone="ghost" onPress={back} />
      </View>
      <View style={{ flex: 2 }}>
        {step < STEPS ? (
          <Button label="DEVAM" onPress={next} disabled={!canNext} />
        ) : (
          <Button label="KARİYERE BAŞLA" tone="gold" onPress={() => stats && onDone(inp, stats)} />
        )}
      </View>
    </View>
  );

  return (
    <Screen footer={footer}>
      <Text style={cs.step}>KARAKTER OLUŞTURMA · {Math.min(step, 8)}/8</Text>

      {step === 1 && (
        <>
          <Title sub="Salonun yaşlı sahibi gözlüğünün üstünden bakıyor: “Buralarda seni daha önce görmedim. Kimsin sen, evlat?”">
            Adın ne?
          </Title>
          <Field label="Ad" value={inp.ad} onChange={(ad) => set({ ad })} />
          <Field label="Soyad" value={inp.soyad} onChange={(soyad) => set({ soyad })} />
          <Field label="Lakap (isteğe bağlı)" value={inp.lakap} onChange={(lakap) => set({ lakap })} placeholder="örn. Demir Yumruk" />
        </>
      )}

      {step === 2 && (
        <>
          <Title sub="Uyruğun, antrenman imkânlarını ve taraftar desteğini belirler.">Nerelisin?</Title>
          <Field label="Memleket (şehir)" value={inp.memleket} onChange={(memleket) => set({ memleket })} placeholder="örn. Erzurum" />
          {Object.entries(COUNTRIES).map(([k, c]) => (
            <Choice
              key={k}
              label={c.ad}
              desc={
                `Antrenman ${dots(c.egitim)} · Taraftar ${dots(c.taraftar)}` +
                (inp.uyruk === k
                  ? `\n📊 İstatistik bonusu: +${Math.round(c.egitim * 0.6)} · 🔥 Başlangıç popülerliği: ${Math.round(c.taraftar * 1.2)}\n🥋 ${gymsFor(k).length} salon seçeneği: ${gymsFor(k).map((g) => g.salon).join(', ')}`
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
          <Title sub={`${COUNTRIES[inp.uyruk].ad}’deki salonlar. Kaliteli salon daha hızlı geliştirir ama kamp ücretleri de yüksektir. Antrenörün uzmanlık alanına odaklanan kamplar %35 daha verimlidir.`}>
            Salonunu seç
          </Title>
          {gymsFor(inp.uyruk).map((g) => {
            const sel = inp.salonId === g.id;
            return (
              <Pressable key={g.id} onPress={() => set({ salonId: g.id })} style={({ pressed }) => [cs.branch, { borderColor: sel ? C.red : C.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                <View style={[cs.branchStripe, { backgroundColor: sel ? C.red : C.border }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <OctIcon name="whistle" color={sel ? C.red : C.dim} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={[cs.branchTitle, SLANT, { fontSize: 18, color: sel ? C.red : C.text }]}>{g.salon.toLocaleUpperCase('tr-TR')}</Text>
                    <Text style={cs.branchDesc}>{g.antrenor}</Text>
                  </View>
                </View>
                <Text style={[cs.branchDesc, { marginTop: 8 }]}>{g.aciklama}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Pill text={`Uzmanlık: ${STAT_LABELS[g.uzmanlik]}`} icon="target" color={C.gold} />
                  <Pill text={`Kalite ${g.kalite}/10`} icon="star-four-points" color={g.kalite >= 5 ? C.green : C.dim} />
                  <Pill text={`Profesyonel kamp: $${(g.kalite * 40).toLocaleString('tr-TR')}/hafta`} icon="cash" color={C.dim} />
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {step === 4 && (
        <>
          <Title sub="Genç dövüşçü hızlı gelişir ama ham başlar. Yaşlı dövüşçü tecrübeli başlar ama zamanı azdır.">Kaç yaşındasın?</Title>
          <View style={cs.ageGrid}>
            {Array.from({ length: 13 }, (_, i) => 18 + i).map((y) => (
              <Pressable key={y} onPress={() => set({ yas: y })} style={[cs.age, inp.yas === y && { borderColor: C.red, backgroundColor: C.redDim }]}>
                <Text style={cs.ageText}>{y}</Text>
              </Pressable>
            ))}
          </View>
          <Card>
            <P>📈 Gelişim hızı: ×{growthMultiplier(inp.yas).toFixed(2)} (kamp puanlarını ve gelişimi çarpar)</P>
            <P>💪 Tecrübe bonusu: tüm istatistiklere +{Math.round((inp.yas - 18) * 0.45)}</P>
            <P>⏳ Kariyer süresi: yaklaşık {41 - inp.yas} yıl. 32 yaştan sonra hız ve çene düşer.</P>
            <P dim>
              {inp.yas <= 22
                ? 'Sünger gibisin. Her kamp seni ileri taşır, ama ilk maçlarda tecrübesizlik ödetir.'
                : inp.yas <= 26
                  ? 'Altın yaş. Hem gelişecek zamanın hem de temel bir olgunluğun var.'
                  : 'Olgun bir başlangıç. Daha güçlü başlarsın, ama saat tıkırdıyor.'}
            </P>
          </Card>
        </>
      )}

      {step === 5 && (
        <>
          <Title sub="Hafif sıkletler hızlı ve dayanıklıdır, ağır sıkletler tek yumrukla bitirir.">Hangi sıklette dövüşeceksin?</Title>
          {(Object.keys(WEIGHT_CLASSES) as WeightClass[]).map((w) => (
            <Choice
              key={w}
              label={`${WEIGHT_CLASSES[w].ad} Sıklet`}
              desc={`${WEIGHT_CLASSES[w].kg} kg · ${WEIGHT_CLASSES[w].lb} lb
${modText(WEIGHT_MODS[w]) || 'Dengeli: etki yok'}`}
              selected={inp.siklet === w}
              tone="plain"
              onPress={() => set({ siklet: w })}
            />
          ))}
        </>
      )}

      {step === 6 && (
        <>
          <Title sub="Güçlü ve zayıf yönlerini bu belirler.">Dövüş geçmişin ne?</Title>
          {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
            <BranchCard key={b} b={b} selected={inp.gecmis === b} inp={inp} onPress={() => set({ gecmis: b })} />
          ))}
        </>
      )}

      {step === 7 && inp.gorunum && (
        <>
          <Title sub="Kafese girdiğinde herkes bu yüzü görecek.">Görünümün</Title>
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <FighterAvatar look={inp.gorunum} size={170} />
            <Text style={[cs.branchTitle, SLANT, { marginTop: 8 }]}>
              {inp.ad.toLocaleUpperCase('tr-TR')} {inp.soyad.toLocaleUpperCase('tr-TR')}
            </Text>
          </View>
          <LookPicker look={inp.gorunum} onChange={(g) => set({ gorunum: g })} />
        </>
      )}

      {step === 8 && (
        <>
          <Title sub="Kendin yazabilir ya da senin için yazmamı isteyebilirsin.">Hikâyen ne?</Title>
          <TextInput
            style={[cs.input, { minHeight: 160, textAlignVertical: 'top' }]}
            multiline
            value={inp.hikaye}
            onChangeText={(hikaye) => set({ hikaye })}
            placeholder="Nereden geliyorsun? Seni kafese ne getirdi?"
            placeholderTextColor={C.faint}
          />
          <Button label="BENİM İÇİN YAZ" tone="ghost" onPress={() => set({ hikaye: generateBackstory(inp) })} />
        </>
      )}

      {step === 9 && stats && (
        <>
          <Title sub={`${BACKGROUNDS[inp.gecmis].ad} · ${WEIGHT_CLASSES[inp.siklet].ad} Sıklet · ${inp.yas} yaş · ${COUNTRIES[inp.uyruk].ad}`}>
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
          <P dim>⭐ Kariyere {START_POINTS} gelişim puanıyla başlıyorsun. Kariyer ekranındaki GELİŞİM sekmesinden istediğin istatistiğe harcayabilirsin.</P>
          <Button
            label={`ZARI YENİDEN AT (${rerolls} hak)`}
            tone="ghost"
            disabled={rerolls <= 0}
            onPress={() => {
              setStats(rollStartingStats(inp));
              setRerolls(rerolls - 1);
            }}
          />
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
  const zc = info.zorluk === 'Kolay' ? C.green : info.zorluk === 'Orta' ? C.gold : C.red;
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
          <Text style={[cs.branchTitle, SLANT, { color: selected ? th.color : C.text }]}>{info.ad.toLocaleUpperCase('tr-TR')}</Text>
          <Text style={cs.branchDesc}>{info.aciklama}</Text>
        </View>
        <Pill text={info.zorluk} color={zc} />
      </View>
      <ModChips mods={info.mods} />
      {selected && preview ? (
        <View style={cs.branchMore}>
          <Text style={[cs.branchDesc, { color: C.text }]}>{info.detay}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <Pill text={`Güçlü: ${info.guclu}`} icon="arrow-up-bold-circle" color={C.green} />
            <Pill text={`Zayıf: ${info.zayif}`} icon="alert-octagon" color={C.red} />
            <Pill text={`Plan: ${info.plan}`} icon="target" color={th.color} />
          </View>
          <Text style={[cs.label, { marginTop: 12 }]}>SEÇİMLERİNLE BEKLENEN BAŞLANGIÇ (ZAR ±3)</Text>
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
      <Text style={cs.label}>TEN RENGİ</Text>
      <Swatches colors={SKIN_TONES} value={look.ten} onPick={(ten) => set({ ten })} />
      <Text style={cs.label}>SAÇ MODELİ</Text>
      <Chips items={HAIR_STYLES} value={look.sac} onPick={(sac) => set({ sac })} />
      <Text style={cs.label}>SAÇ RENGİ</Text>
      <Swatches colors={HAIR_COLORS} value={look.sacRenk} onPick={(sacRenk) => set({ sacRenk })} />
      <Text style={cs.label}>GÖZ RENGİ</Text>
      <Swatches colors={EYE_COLORS} value={look.goz} onPick={(goz) => set({ goz })} />
      <Text style={cs.label}>SAKAL</Text>
      <Chips items={BEARDS} value={look.sakal} onPick={(sakal) => set({ sakal })} />
      <Text style={cs.label}>DETAYLAR</Text>
      <Chips
        items={[
          { key: 'yara', ad: look.yara ? '✓ Kaşta yara izi' : 'Kaşta yara izi' },
          { key: 'dovme', ad: look.dovme ? '✓ Omuz dövmesi' : 'Omuz dövmesi' },
        ]}
        value={(look.yara ? 'yara' : '') as 'yara'}
        onPick={(k) => set(k === 'yara' ? { yara: !look.yara } : { dovme: !look.dovme })}
      />
      <View style={{ marginTop: 12 }}>
        <Button
          label="Rastgele"
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
