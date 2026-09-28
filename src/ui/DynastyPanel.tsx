// Nesil modu arayüzü: karakter oluşturmada miras bandı ve profilde hanedan geçmişi.
import { StyleSheet, Text, View } from 'react-native';
import { dynastyScore, type Heritage } from '../engine/dynasty';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { money } from '../engine/career';
import { Icon, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

/** Karakter oluşturmanın ilk adımında: hangi hanedan, ne miras kalıyor. */
export function HeritageBanner({ h }: { h: Heritage }) {
  const eb = h.ebeveyn;
  const items = [
    L("💰 Miras: {0}", [money(h.para)]),
    L("🔥 Ünlü soyadı: popülerlik +{0}", [h.populerlik]),
    L("🥋 Köşende {0} (antrenör kalitesi {1}/10)", [`${eb.ad} ${eb.soyad}`, h.antrenorKalite]),
    L("🧬 Aileden gelen yetenek: en güçlü yön +3"),
    ...(h.akademi ? [L("🏛 Aile akademisi seninle")] : []),
  ];
  return (
    <View style={st.banner}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FighterAvatar look={eb.gorunum} size={56} ring={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>{L("NESİL {0} · {1} HANEDANI", [h.nesil, eb.soyad.toLocaleUpperCase(LOC)])}</Text>
          <Text style={[st.parent, SLANT]}>{`${eb.ad} ${eb.soyad}`}</Text>
          <Text style={st.meta}>
            {eb.rekor.g}-{eb.rekor.m}-{eb.rekor.b} · {eb.kemer} {L("kemer")}
            {eb.hof ? ' · 🏛 Hall of Fame' : ''}
          </Text>
        </View>
      </View>
      {items.map((t) => (
        <Text key={t} style={st.item}>
          {t}
        </Text>
      ))}
    </View>
  );
}

/** Profilde: önceki nesiller ve hanedan puanı. */
export function DynastySection({ s }: { s: GameState }) {
  const list = s.hanedan ?? [];
  if (!list.length) return null;
  return (
    <View style={st.box}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={st.title}>{L("HANEDAN · NESİL {0}", [s.nesil ?? list.length + 1])}</Text>
        <Text style={st.score}>{L("Hanedan puanı {0}", [dynastyScore(s)])}</Text>
      </View>
      {list.map((a) => (
        <View key={`${a.nesil}-${a.ad}`} style={st.row}>
          <FighterAvatar look={a.gorunum} size={40} ring={a.hof ? C.gold : C.border} />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>
              {L("{0}. nesil", [a.nesil])} · {a.ad} {a.lakap ? `“${a.lakap}” ` : ''}
              {a.soyad}
            </Text>
            <Text style={st.meta}>
              {a.rekor.g}-{a.rekor.m}-{a.rekor.b} · {a.kemer} {L("kemer")} · {L("efsane {0}", [a.efsane])}
            </Text>
          </View>
          {a.hof ? <Icon name="pillar" size={18} color={C.gold} /> : null}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  banner: { backgroundColor: '#1a1405', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 14, padding: 14, gap: 6, marginBottom: 14 },
  kicker: { color: C.goldDeep, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  parent: { color: C.gold, fontFamily: F.display, fontSize: 20 },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  item: { color: C.text, fontFamily: F.body, fontSize: 13 },
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  score: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: C.text, fontFamily: F.semi, fontSize: 13 },
});
