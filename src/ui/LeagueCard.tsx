// Amatör Ligi kartı: merkezde kısa ilerleme, sıralama sekmesinde tam tablo.
import { StyleSheet, Text, View } from 'react-native';
import { finalHazir, LIG_BASAMAK, ligAcik, madalyaEmoji, tablo } from '../engine/amateurLeague';
import { L } from '../i18n';
import type { GameState } from '../engine/types';
import { Bar, Card } from './components';
import { C, F } from './theme';

export function LeagueCard({ s, compact }: { s: GameState; compact?: boolean }) {
  if (!ligAcik(s)) return null;
  const l = s.amLig!;
  const b = LIG_BASAMAK[l.basamak];
  return (
    <Card>
      <View style={st.head}>
        <Text style={st.kicker}>{L("AMATÖR LİGİ · {0}. BASAMAK", [l.basamak + 1])}</Text>
        <Text style={st.medals}>{LIG_BASAMAK.map((_, i) => (l.madalya.includes(i) ? madalyaEmoji(i) : '▫️')).join(' ')}</Text>
      </View>
      <Text style={st.title}>{b.ad()}</Text>
      {l.tamam ? (
        <Text style={st.sub}>{L("Ulusal şampiyonsun. Sıradaki durak profesyonel kafes.")}</Text>
      ) : (
        <>
          <Bar value={(Math.min(l.puan, b.hedef) / b.hedef) * 100} color={finalHazir(s) ? C.gold : C.green} />
          <Text style={st.sub}>
            {finalHazir(s) ? L("Final hazır! Sıradaki rakip listesinde.") : L("Finale {0} puan kaldı · Galibiyet 2-5 puan, yenilgi -1", [b.hedef - l.puan])}
          </Text>
        </>
      )}
      {!compact ? (
        <View style={{ marginTop: 10, gap: 4 }}>
          {tablo(s).map((r, i) => (
            <View key={r.sen ? 'sen' : r.o!.id} style={[st.row, r.sen && st.me]}>
              <Text style={st.rank}>{i + 1}</Text>
              <Text style={[st.name, r.sen && { color: C.red }]} numberOfLines={1}>
                {r.sen ? `${s.fighter.ad} ${s.fighter.soyad}` : `${r.o!.ad} “${r.o!.lakap}” ${r.o!.soyad}`}
              </Text>
              <Text style={st.pts}>{r.puan}</Text>
            </View>
          ))}
          <Text style={st.note}>{L("Şehir Ligi → Bölge Şampiyonası → Ulusal Turnuva. Yükseliş Grand Prix'i ilk madalyadan sonra kestirme yol olabilir.")}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, flex: 1 },
  medals: { fontSize: 14 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 20, marginTop: 2, marginBottom: 8 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#ffffff08' },
  me: { backgroundColor: '#2a0a10' },
  rank: { width: 18, color: C.dim, fontFamily: F.display, fontSize: 13 },
  name: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  pts: { color: C.gold, fontFamily: F.display, fontSize: 14 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 11, marginTop: 6 },
});
