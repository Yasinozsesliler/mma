// Kariyer ekranının altında sabit sekme çubuğu: Kariyer · Gelişim · Hayat · Koleksiyon · Profil.
// Uzun kaydırmada aşağıda kalan özellikler (sosyal medya, gece hayatı, albüm…) her zaman bir dokunuş uzakta.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

export type NavItem<K extends string> = { key: K; label: string; icon: IconName; badge?: string | number | null };

export function HubNav<K extends string>({ items, value, onChange }: { items: NavItem<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={st.bar}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              if (on) return;
              sfx('click');
              onChange(it.key);
            }}
            style={st.item}
            hitSlop={4}
          >
            <View>
              <Icon name={it.icon} size={22} color={on ? C.gold : C.dim} />
              {it.badge ? <Text style={[st.badge, it.badge === '•' && st.dot]}>{it.badge === '•' ? '' : it.badge}</Text> : null}
            </View>
            <Text style={[st.label, on && { color: C.gold }]} numberOfLines={1}>
              {it.label}
            </Text>
            {on ? <View style={st.under} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch', marginHorizontal: -6, marginTop: -4 },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 10.5 },
  under: { position: 'absolute', top: -9, width: 26, height: 3, borderRadius: 2, backgroundColor: C.gold },
  badge: { position: 'absolute', top: -5, right: -12, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red, color: '#fff', fontFamily: F.bold, fontSize: 10, textAlign: 'center', lineHeight: 17, paddingHorizontal: 4, overflow: 'hidden' },
  dot: { top: -2, right: -4, minWidth: 10, width: 10, height: 10, borderRadius: 5, paddingHorizontal: 0 },
});
