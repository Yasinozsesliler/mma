// Berber ve dövmeci: saç modeli, saç rengi, sakal ve dövmeler; önizleme ve toplam ücret.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { applyStyle, hasTattoo, styleCost, stylePrice, TATTOOS, type Tattoo } from '../engine/style';
import type { Appearance, GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Screen, Section, Title } from './components';
import { BEARDS, DEFAULT_LOOK, FighterAvatar, HAIR_COLORS, HAIR_STYLES } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const TATTOO_NAMES: Record<Tattoo, () => string> = {
  omuz: () => L("Omuz"),
  gogus: () => L("Göğüs kartalı"),
  kol: () => L("Kol (tribal)"),
  boyun: () => L("Boyun yıldızı"),
};

export function StyleScreen({ s, act }: { s: GameState; act: Act }) {
  const cur = s.fighter.gorunum ?? DEFAULT_LOOK;
  const [draft, setDraft] = useState<Appearance>({ ...cur });
  const [msg, setMsg] = useState<string | null>(null);
  const set = (p: Partial<Appearance>) => setDraft((d) => ({ ...d, ...p }));
  const toggleTattoo = (t: Tattoo) =>
    setDraft((d) => {
      if (t === 'omuz') return { ...d, dovme: !d.dovme };
      const list = d.dovmeler ?? [];
      return { ...d, dovmeler: list.includes(t) ? list.filter((x) => x !== t) : [...list, t] };
    });
  const cost = styleCost(s, draft);
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={cost ? L("Onayla · {0}", [money(cost)]) : L("Değişiklik yok")}
            icon="content-cut"
            tone="gold"
            disabled={!cost || s.para < cost}
            onPress={() => {
              buzz('basari');
              act((x) => setMsg(applyStyle(x, draft)));
            }}
          />
          <Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />
        </View>
      }
    >
      <Title kicker={L("BERBER VE DÖVMECİ")} sub={L("Görünüşün senin imzan. Değişiklikler ücretli; dövme silmek pahalıdır.")}>
        {L("Yeni Tarz")}
      </Title>
      <View style={st.preview}>
        <FighterAvatar look={cur} size={90} />
        <Text style={st.arrow}>→</Text>
        <FighterAvatar look={draft} size={120} ring={C.gold} />
      </View>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
      <Section>{L("SAÇ MODELİ · {0}", [money(stylePrice(s, 'sac'))])}</Section>
      <View style={st.chips}>
        {HAIR_STYLES.filter((h) => (draft.kadin ? true : h.key !== 'atkuyrugu')).map((h) => (
          <Pressable key={h.key} onPress={() => set({ sac: h.key })} style={[st.chip, draft.sac === h.key && st.chipOn]}>
            <Text style={[st.chipText, draft.sac === h.key && { color: '#fff' }]}>{h.ad}</Text>
          </Pressable>
        ))}
      </View>
      <Section>{L("SAÇ RENGİ · {0}", [money(stylePrice(s, 'sacRenk'))])}</Section>
      <View style={st.chips}>
        {HAIR_COLORS.map((c, i) => (
          <Pressable key={c} onPress={() => set({ sacRenk: i })} style={[st.swatch, { backgroundColor: c }, draft.sacRenk === i && st.swatchOn]} />
        ))}
      </View>
      {!draft.kadin ? (
        <>
          <Section>{L("SAKAL · {0}", [money(stylePrice(s, 'sakal'))])}</Section>
          <View style={st.chips}>
            {BEARDS.map((b) => (
              <Pressable key={b.key} onPress={() => set({ sakal: b.key })} style={[st.chip, draft.sakal === b.key && st.chipOn]}>
                <Text style={[st.chipText, draft.sakal === b.key && { color: '#fff' }]}>{b.ad}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Section>{L("DÖVMELER · {0} / silme {1}", [money(stylePrice(s, 'dovme')), money(stylePrice(s, 'lazer'))])}</Section>
      <View style={st.chips}>
        {TATTOOS.map((t) => {
          const on = hasTattoo(draft, t);
          return (
            <Pressable key={t} onPress={() => toggleTattoo(t)} style={[st.chip, on && st.chipOn]}>
              <Text style={[st.chipText, on && { color: '#fff' }]}>{on ? '✓ ' : ''}{TATTOO_NAMES[t]()}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 8 },
  arrow: { color: C.gold, fontFamily: F.display, fontSize: 26 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: C.gold },
});
