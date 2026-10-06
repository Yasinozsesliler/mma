// Kafespedia: dövüşçünün otomatik yazılan ansiklopedi sayfası (tam ekran). Paylaşım kartı da buradan açılır.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ORGS } from '../engine/data';
import type { GameState } from '../engine/types';
import { wikiOf } from '../engine/wiki';
import { L } from '../i18n';
import { wikiCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { SERIF, WIKI } from '../share/WikiCard';
import { methodLabel } from '../engine/fight';
import { Button, Icon } from './components';
import { FighterAvatar } from './FighterAvatar';
import { F } from './theme';

const SONUC = { G: { t: () => L("Galibiyet"), c: '#d5fdd5' }, M: { t: () => L("Mağlubiyet"), c: '#fdd5d5' }, B: { t: () => L("Beraberlik"), c: '#eaecf0' } };

/** Profilde ve emeklilikte: "Kafespedia sayfan" düğmesi ve tam ekran sayfa. */
export function WikiButton({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button label={L("Kafespedia sayfan")} icon="book-open-page-variant" tone="ghost" onPress={() => setOpen(true)} />
      {open ? <WikiModal s={s} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function WikiModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const w = wikiOf(s);
  const ins = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View style={[st.page, { paddingTop: ins.top }]}>
        <View style={st.top}>
          <View style={st.logo}>
            <Text style={st.logoK}>K</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.brand}>{L("Kafespedia")}</Text>
            <Text style={st.brandSub}>{L("Özgür dövüş ansiklopedisi")}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Icon name="close" size={24} color={WIKI.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + ins.bottom }}>
          <Text style={st.title}>{w.baslik}</Text>
          <View style={st.rule} />
          <Text style={st.from}>{L("Kafespedia, özgür dövüş ansiklopedisi")}</Text>

          <View style={st.info}>
            <Text style={st.infoHead}>{w.lakap ? `${w.baslik} “${w.lakap}”` : w.baslik}</Text>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <FighterAvatar look={s.fighter.gorunum} size={130} ring={WIKI.line} bg="#eaecf0" />
            </View>
            {w.bilgi.map(([k, v]) => (
              <View key={k} style={st.row}>
                <Text style={st.key}>{k}</Text>
                <Text style={st.val}>{v}</Text>
              </View>
            ))}
          </View>

          <Text style={st.p}>{w.ozet}</Text>

          <View style={st.toc}>
            <Text style={st.tocTitle}>{L("İçindekiler")}</Text>
            {[...w.bolumler.map((b) => b.baslik), ...(w.basarilar.length ? [L("Şampiyonluklar ve başarılar")] : []), ...(w.kayit.length ? [L("Dövüş kaydı")] : [])].map((b, i) => (
              <Text key={b} style={st.tocItem}>
                {i + 1} {b}
              </Text>
            ))}
          </View>

          {w.bolumler.map((b) => (
            <View key={b.baslik}>
              <Text style={st.h2}>{b.baslik}</Text>
              {b.metin.split('\n').map((p, i) => (
                <Text key={i} style={st.p}>
                  {p}
                </Text>
              ))}
            </View>
          ))}

          {w.basarilar.length ? (
            <>
              <Text style={st.h2}>{L("Şampiyonluklar ve başarılar")}</Text>
              {w.basarilar.map((g) => (
                <View key={g.baslik} style={{ marginBottom: 6 }}>
                  <Text style={st.h3}>{g.baslik}</Text>
                  {g.maddeler.map((m, i) => (
                    <View key={i} style={st.li}>
                      <Text style={st.bullet}>•</Text>
                      <Text style={[st.p, { flex: 1, marginBottom: 2 }]}>{m}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {w.kayit.length ? (
            <>
              <Text style={st.h2}>{L("Dövüş kaydı")}</Text>
              <View style={st.table}>
                <View style={[st.tr, { backgroundColor: '#eaecf0' }]}>
                  <Text style={[st.th, { flex: 1.1 }]}>{L("Sonuç")}</Text>
                  <Text style={[st.th, { flex: 1.6 }]}>{L("Rakip")}</Text>
                  <Text style={[st.th, { flex: 1.2 }]}>{L("Yöntem")}</Text>
                  <Text style={[st.th, { flex: 0.5 }]}>R</Text>
                  <Text style={[st.th, { flex: 0.8 }]}>Org</Text>
                </View>
                {w.kayit.map((h, i) => (
                  <View key={i} style={st.tr}>
                    <Text style={[st.td, { flex: 1.1, backgroundColor: SONUC[h.sonuc].c }]}>{SONUC[h.sonuc].t()}</Text>
                    <Text style={[st.td, { flex: 1.6, color: WIKI.link }]} numberOfLines={1}>
                      {h.rakip}
                    </Text>
                    <Text style={[st.td, { flex: 1.2 }]} numberOfLines={1}>
                      {methodLabel(h.yontem as never) ?? h.yontem}
                    </Text>
                    <Text style={[st.td, { flex: 0.5 }]}>{h.raunt}</Text>
                    <Text style={[st.td, { flex: 0.8 }]} numberOfLines={1}>
                      {ORGS[h.org]?.kisa ?? h.org}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={st.edit}>{L("Bu sayfa en son kariyerinin {0}. haftasında düzenlendi.", [s.hafta])}</Text>
          <View style={{ marginTop: 14 }}>
            <ShareButton data={wikiCard(s)} label={L("Sayfanı paylaş")} tone="gold" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#ffffff' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: WIKI.box, borderBottomWidth: 1, borderBottomColor: WIKI.line },
  logo: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: WIKI.text, alignItems: 'center', justifyContent: 'center' },
  logoK: { fontFamily: SERIF, fontSize: 20, color: WIKI.text },
  brand: { fontFamily: SERIF, fontSize: 20, color: WIKI.text },
  brandSub: { fontFamily: SERIF, fontSize: 10, color: WIKI.gray },
  title: { fontFamily: SERIF, fontSize: 30, color: WIKI.text },
  rule: { height: 1, backgroundColor: WIKI.line, marginTop: 2 },
  from: { fontFamily: SERIF, fontSize: 12, color: WIKI.gray, fontStyle: 'italic', marginTop: 4, marginBottom: 10 },
  info: { borderWidth: 1, borderColor: WIKI.line, backgroundColor: WIKI.box, padding: 5, marginBottom: 12 },
  infoHead: { backgroundColor: WIKI.head, fontFamily: SERIF, fontWeight: 'bold', fontSize: 15, color: WIKI.text, textAlign: 'center', paddingVertical: 4 },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eaecf0', paddingVertical: 4, paddingHorizontal: 6 },
  key: { width: 130, fontFamily: F.bold, fontSize: 13, color: WIKI.text },
  val: { flex: 1, fontFamily: F.body, fontSize: 13, color: WIKI.text },
  p: { fontFamily: SERIF, fontSize: 15, lineHeight: 23, color: WIKI.text, marginBottom: 10 },
  toc: { alignSelf: 'flex-start', borderWidth: 1, borderColor: WIKI.line, backgroundColor: WIKI.box, padding: 10, marginBottom: 8, minWidth: 200 },
  tocTitle: { fontFamily: F.bold, fontSize: 13, color: WIKI.text, textAlign: 'center', marginBottom: 4 },
  tocItem: { fontFamily: F.body, fontSize: 13, color: WIKI.link, lineHeight: 20 },
  h2: { fontFamily: SERIF, fontSize: 22, color: WIKI.text, borderBottomWidth: 1, borderBottomColor: WIKI.line, paddingBottom: 2, marginTop: 14, marginBottom: 8 },
  h3: { fontFamily: F.bold, fontSize: 15, color: WIKI.text, marginBottom: 4 },
  li: { flexDirection: 'row', gap: 6, paddingLeft: 6 },
  bullet: { fontFamily: SERIF, fontSize: 15, lineHeight: 23, color: WIKI.text },
  table: { borderWidth: 1, borderColor: WIKI.line },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: WIKI.line },
  th: { fontFamily: F.bold, fontSize: 11, color: WIKI.text, padding: 4 },
  td: { fontFamily: F.body, fontSize: 11, color: WIKI.text, padding: 4 },
  edit: { fontFamily: F.body, fontSize: 11, color: WIKI.gray, marginTop: 14 },
});

