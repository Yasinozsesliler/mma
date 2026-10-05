// Ana ekran kutucukları kategorilere ayrılır: Antrenman · Yaşam · Marka · Koleksiyon. Bildirimi olan sekmede nokta.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { Icon, type IconName } from './components';
import { FadeIn } from './anim';
import { ActionGrid } from './HubHome';
import { C, F } from './theme';

export type HubCat = 'antrenman' | 'yasam' | 'marka' | 'koleksiyon';
export type HubTile = { cat: HubCat; show: boolean; badge: unknown; node: ReactNode };

const CATS: { key: HubCat; label: () => string; icon: IconName }[] = [
  { key: 'antrenman', label: () => L("ANTRENMAN"), icon: 'weight-lifter' },
  { key: 'yasam', label: () => L("YAŞAM"), icon: 'home-heart' },
  { key: 'marka', label: () => L("MARKA"), icon: 'star-circle' },
  { key: 'koleksiyon', label: () => L("KOLEKSİYON"), icon: 'cards' },
];

export function HubCategories({ cat, setCat, tiles }: { cat: HubCat; setCat: (c: HubCat) => void; tiles: HubTile[] }) {
  const visible = tiles.filter((t) => t.show);
  const cats = CATS.filter((c) => visible.some((t) => t.cat === c.key));
  // Seçili kategori boşsa (ör. amatörde Marka) ilk dolu kategoriye düş
  const active = cats.some((c) => c.key === cat) ? cat : cats[0]?.key ?? 'antrenman';
  return (
    <View style={{ marginTop: 4 }}>
      <View style={st.row}>
        {cats.map((c) => {
          const on = c.key === active;
          const dot = visible.some((t) => t.cat === c.key && !!t.badge);
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                sfx('click');
                setCat(c.key);
              }}
              style={[st.chip, on && st.chipOn]}
            >
              <Icon name={c.icon} size={14} color={on ? '#fff' : C.dim} />
              <Text style={[st.chipText, on && { color: '#fff' }]} numberOfLines={1}>
                {c.label()}
              </Text>
              {dot && !on ? <View style={st.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
      <FadeIn key={active}>
        <ActionGrid>{visible.filter((t) => t.cat === active).map((t) => t.node)}</ActionGrid>
      </FadeIn>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { color: C.dim, fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.5 },
  dot: { position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
});
