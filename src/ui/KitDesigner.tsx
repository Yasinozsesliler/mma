// Dolapta Şampiyon Paketi tasarımcısı: kendi şortunu ve kemerini renk renk tasarla. Yalnızca görünüm.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { equip } from '../cosmetics';
import { BELT_METALS, KIT_COLORS, setCustomKit, useCustomKit } from '../customKit';
import { cosmeticById, type Cosmetic, type Pattern } from '../engine/cosmetics';
import { L } from '../i18n';
import { PURCHASES, usePremium } from '../monetization';
import { Button, Icon } from './components';
import { BuyPremium } from './PremiumCard';
import { C, F } from './theme';

const PATTERNS: { key: Pattern | null; ad: () => string }[] = [
  { key: null, ad: () => L("Desensiz") },
  { key: 'alev', ad: () => L("Alev") },
  { key: 'simsek', ad: () => L("Şimşek") },
  { key: 'kaplan', ad: () => L("Kaplan") },
  { key: 'yildiz', ad: () => L("Yıldız") },
];
const METAL_NAME: Record<string, () => string> = { gold: () => L("Altın"), silver: () => L("Gümüş"), bronze: () => L("Bronz"), chrome: () => L("Krom"), rose: () => L("Gül altın") };

function Palette({ value, onPick, colors = KIT_COLORS }: { value: string; onPick: (c: string) => void; colors?: string[] }) {
  return (
    <View style={st.pal}>
      {colors.map((c) => (
        <Pressable key={c} onPress={() => onPick(c)} style={[st.sw, { backgroundColor: c }, value === c && st.swOn]} hitSlop={2} />
      ))}
    </View>
  );
}

/** slot: 'sort' ya da 'kemer'. onPreview: vitrinde göster (dolap ekranı yeniden çizilsin). */
export function KitDesigner({ slot, onPreview }: { slot: 'sort' | 'kemer'; onPreview: (x: Cosmetic) => void }) {
  const premium = usePremium();
  const kit = useCustomKit();
  const [open, setOpen] = useState(false);
  if (!premium && !PURCHASES) return null;
  const item = cosmeticById(slot === 'sort' ? 'sort_ozel' : 'kem_ozel')!;
  const change = (p: Parameters<typeof setCustomKit>[0]) => {
    setCustomKit(p);
    onPreview(item);
  };
  return (
    <LinearGradient colors={['#2a1d05', '#0c0d10']} style={st.box}>
      <Pressable onPress={() => (setOpen(!open), onPreview(item))} style={st.head}>
        <Icon name="palette" size={20} color={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{slot === 'sort' ? L("Şortunu tasarla") : L("Kemerini tasarla")}</Text>
          <Text style={st.sub}>{L("👑 Şampiyon Paketi · renkleri ve deseni sen seç")}</Text>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.faint} />
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
          {slot === 'sort' ? (
            <>
              <Text style={st.label}>{L("ŞORT RENGİ")}</Text>
              <Palette value={kit.sort[0]} onPick={(c) => change({ sort: [c, kit.sort[1]] })} />
              <Text style={st.label}>{L("ŞERİT RENGİ")}</Text>
              <Palette value={kit.sort[1]} onPick={(c) => change({ sort: [kit.sort[0], c] })} />
              <Text style={st.label}>{L("DESEN")}</Text>
              <View style={st.chips}>
                {PATTERNS.map((p) => (
                  <Pressable key={p.key ?? 'yok'} onPress={() => change({ desen: p.key })} style={[st.chip, kit.desen === p.key && st.chipOn]}>
                    <Text style={[st.chipText, kit.desen === p.key && { color: '#111' }]}>{p.ad()}</Text>
                  </Pressable>
                ))}
              </View>
              {kit.desen ? (
                <>
                  <Text style={st.label}>{L("DESEN RENGİ")}</Text>
                  <Palette value={kit.desenRenk} onPick={(c) => change({ desenRenk: c })} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={st.label}>{L("METAL")}</Text>
              <View style={st.chips}>
                {BELT_METALS.map((m) => (
                  <Pressable key={m.ad} onPress={() => change({ kemer: [m.renk[0], m.renk[1], kit.kemer[2], kit.kemer[3]] })} style={[st.chip, kit.kemer[1] === m.renk[1] && st.chipOn]}>
                    <Text style={[st.chipText, kit.kemer[1] === m.renk[1] && { color: '#111' }]}>{METAL_NAME[m.ad]()}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={st.label}>{L("KAYIŞ")}</Text>
              <Palette value={kit.kemer[2]} onPick={(c) => change({ kemer: [kit.kemer[0], kit.kemer[1], c, kit.kemer[3]] })} />
              <Text style={st.label}>{L("TAŞ")}</Text>
              <Palette value={kit.kemer[3]} onPick={(c) => change({ kemer: [kit.kemer[0], kit.kemer[1], kit.kemer[2], c] })} />
            </>
          )}
          {premium ? (
            <Button
              label={L("Kuşan")}
              icon="check"
              tone="gold"
              onPress={() => {
                sfx('click');
                equip(item);
              }}
            />
          ) : (
            <BuyPremium />
          )}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1, borderColor: C.gold + '66', padding: 12, marginBottom: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: C.gold, fontFamily: F.bold, fontSize: 14 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 11.5, marginTop: 1 },
  label: { color: C.faint, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5, marginTop: 4 },
  pal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sw: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#ffffff22' },
  swOn: { borderColor: C.gold, transform: [{ scale: 1.12 }] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.text, fontFamily: F.semi, fontSize: 12 },
});
