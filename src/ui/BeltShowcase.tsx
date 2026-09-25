// Kemer vitrini: kapalıyken cam bir dolap, dokununca kemerler tam ekran, spot ışığı altında açılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { activeBelts, champLabel, maxHeldBelts } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { Belt } from './Belt';
import { Icon, SLANT } from './components';
import { C, F, R } from './theme';

function Spotlight({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <View style={bs.stage}>
      <LinearGradient colors={active ? ['rgba(255,236,190,0.22)', 'rgba(255,236,190,0.04)', 'rgba(0,0,0,0)'] : ['rgba(200,210,220,0.10)', 'rgba(0,0,0,0)']} style={bs.beam} />
      {children}
      <LinearGradient colors={active ? ['#3a2c10', '#1a1307'] : ['#24262b', '#131417']} style={bs.pedestal} />
    </View>
  );
}

export function BeltShowcase({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const belts = (s.kemerler ?? []).slice().reverse();
  const aktif = activeBelts(s);
  const held = maxHeldBelts(s);
  const savunma = belts.reduce((a, b) => a + b.savunma, 0);
  const preview = (aktif.length ? aktif : belts).slice(0, 3);

  return (
    <>
      <Pressable onPress={() => belts.length && setOpen(true)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={['#4a3514', '#1e1407', '#3a2a10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bs.frame}>
          <LinearGradient colors={['#15130f', '#070707']} style={bs.glass}>
            <LinearGradient colors={['rgba(255,240,200,0.18)', 'rgba(0,0,0,0)']} style={bs.topLight} />
            {/* Camın yansıması */}
            <View style={bs.reflect} />
            <View style={bs.caseHead}>
              <Text style={[bs.caseTitle, SLANT]}>KEMER VİTRİNİ</Text>
              {held >= 2 ? (
                <View style={bs.champTag}>
                  <Text style={bs.champTagText}>{champLabel(held).en}</Text>
                </View>
              ) : null}
            </View>
            {belts.length ? (
              <View style={bs.previewRow}>
                {preview.map((b, i) => (
                  <View key={i} style={[bs.previewBelt, { marginTop: i * 14, zIndex: 10 - i, marginLeft: i ? -70 : 0 }]}>
                    <Belt org={b.org} siklet={b.siklet} width={150} dim={!b.aktif} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={bs.empty}>
                <Icon name="trophy-outline" size={46} color="#3a3d45" />
                <Text style={bs.emptyText}>Vitrin boş. İlk kemerin burada parlayacak.</Text>
              </View>
            )}
            <View style={bs.shelf} />
            <View style={bs.caseFoot}>
              <Text style={bs.caseStats}>
                {belts.length} KEMER · {aktif.length} AKTİF · {savunma} SAVUNMA
              </Text>
              {belts.length ? (
                <View style={bs.openBtn}>
                  <Text style={bs.openText}>VİTRİNİ AÇ</Text>
                  <Icon name="chevron-right" size={16} color={C.gold} />
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <LinearGradient colors={['#17120a', '#060606', '#000']} style={{ flex: 1 }}>
          <View style={[bs.modalHead, { paddingTop: insets.top + 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={bs.modalKicker}>
                {s.fighter.ad} {s.fighter.soyad}
              </Text>
              <Text style={[bs.modalTitle, SLANT]}>KEMER VİTRİNİ</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} style={bs.close} hitSlop={10}>
              <Icon name="close" size={22} color={C.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
            {held >= 2 ? (
              <LinearGradient colors={['#4a3508', '#1a1508']} style={bs.banner}>
                <Icon name="trophy-variant" size={22} color={C.gold} />
                <Text style={[bs.bannerText, SLANT]}>
                  {champLabel(held).en} · AYNI ANDA {held} KEMER
                </Text>
              </LinearGradient>
            ) : null}
            {belts.map((b, i) => (
              <View key={i} style={[bs.item, b.aktif && { borderColor: '#5a4312' }]}>
                <Spotlight active={b.aktif}>
                  <Belt org={b.org} siklet={b.siklet} width={300} dim={!b.aktif} />
                </Spotlight>
                <View style={bs.plaque}>
                  <View style={{ flex: 1 }}>
                    <Text style={bs.plaqueOrg}>{ORGS[b.org].ad.toLocaleUpperCase('tr-TR')}</Text>
                    <Text style={[bs.plaqueTitle, SLANT]}>{WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase('tr-TR')} SIKLET ŞAMPİYONU</Text>
                    <Text style={bs.plaqueMeta}>
                      {b.yas} yaşında kazanıldı · {b.savunma ? `${b.savunma} başarılı savunma` : 'Savunma yok'}
                    </Text>
                    {b.savunma ? (
                      <View style={{ flexDirection: 'row', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                        {Array.from({ length: Math.min(b.savunma, 15) }, (_, k) => (
                          <Icon key={k} name="shield-check" size={14} color={b.aktif ? C.gold : C.faint} />
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View style={[bs.status, { borderColor: b.aktif ? C.gold : C.faint }]}>
                    <Icon name={b.aktif ? 'crown' : 'history'} size={14} color={b.aktif ? C.gold : C.faint} />
                    <Text style={[bs.statusText, { color: b.aktif ? C.gold : C.faint }]}>{b.aktif ? 'AKTİF' : 'GEÇMİŞ'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </>
  );
}

const bs = StyleSheet.create({
  frame: { borderRadius: R + 6, padding: 4, marginBottom: 6 },
  glass: { borderRadius: R + 3, overflow: 'hidden', paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  reflect: { position: 'absolute', top: -40, bottom: -40, width: 40, left: '62%', backgroundColor: 'rgba(255,255,255,0.035)', transform: [{ rotate: '18deg' }] },
  caseHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseTitle: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 2 },
  champTag: { backgroundColor: C.gold, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 2, transform: [{ skewX: '-10deg' }] },
  champTagText: { color: '#000', fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  previewRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', minHeight: 110, marginTop: 14 },
  previewBelt: { shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', height: 110, gap: 6 },
  emptyText: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  shelf: { height: 6, borderRadius: 2, backgroundColor: '#2a1d0b', marginTop: 8, borderTopWidth: 1, borderTopColor: '#6a4f1e' },
  caseFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  caseStats: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  modalHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2a2210', maxWidth: 560, width: '100%', alignSelf: 'center' },
  modalKicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  modalTitle: { color: C.gold, fontFamily: F.display, fontSize: 28, letterSpacing: 1.5 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 14 },
  bannerText: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  item: { borderRadius: R + 2, borderWidth: 1, borderColor: C.border, backgroundColor: '#0a0a0b', marginBottom: 16, overflow: 'hidden' },
  stage: { alignItems: 'center', paddingTop: 30, paddingBottom: 0 },
  beam: { position: 'absolute', top: 0, left: '15%', right: '15%', height: '100%', borderBottomLeftRadius: 200, borderBottomRightRadius: 200 },
  pedestal: { width: '80%', height: 14, borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 14 },
  plaque: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#1f1a10', backgroundColor: '#0e0d0a' },
  plaqueOrg: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  plaqueTitle: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 2 },
  plaqueMeta: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
});
