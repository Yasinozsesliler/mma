// Ayarlar: gruplanmış kartlar, her satırda ikon + başlık + kısa açıklama + anahtar. Dil seçimi bayraklı ızgara.
import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setAnnouncer, useAnnouncer } from '../announcer';
import { privacyUrl } from '../appConfig';
import { setSoundSettings, useSoundSettings } from '../audio';
import type { GameState } from '../engine/types';
import { setHaptics, useHaptics } from '../haptics';
import { L, LANG, LANGS, LOC } from '../i18n';
import { setLang } from '../i18n/boot';
import { setLive, useLive } from '../livePref';
import { adPrivacyRequired, showAdPrivacyOptions } from '../monetization';
import { disableNotifications, enableNotifications, NOTIFY, useNotifyState } from '../notify';
import { setLowPerf, useLowPerf } from '../perfPref';
import { setQte, useQte } from '../qtePref';
import { FeedbackRow, ImportCard } from './CareerTransfer';
import { Icon, SLANT, type IconName } from './components';
import { useOfflineStatus } from './offline';
import { C, F } from './theme';

/** Kayan anahtar (iOS tarzı), altın renkte. */
function Toggle({ on }: { on: boolean }) {
  const [a] = useState(() => new Animated.Value(on ? 1 : 0));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.timing(a, { toValue: on ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [on, a]);
  return (
    <Animated.View style={[st.track, { backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['#2a2c33', C.gold] }) }]}>
      <Animated.View style={[st.knob, { transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] }]} />
    </Animated.View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={st.groupTitle}>{title}</Text>
      <View style={st.group}>{children}</View>
    </View>
  );
}

function Row({ icon, color, title, sub, on, onPress, last }: { icon: IconName; color: string; title: string; sub: string; on?: boolean; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, !last && st.rowLine, pressed && { backgroundColor: '#ffffff08' }]}>
      <View style={[st.rowIcon, { backgroundColor: color + '1f', borderColor: color + '55' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={st.rowSub} numberOfLines={3}>
          {sub}
        </Text>
      </View>
      {on == null ? <Icon name="chevron-right" size={20} color={C.faint} /> : <Toggle on={on} />}
    </Pressable>
  );
}

export function SettingsSheet({ onClose, canImport, onImport }: { onClose: () => void; canImport: boolean; onImport: (g: GameState) => void }) {
  const ins = useSafeAreaInsets();
  const ses = useSoundSettings();
  const spiker = useAnnouncer();
  const titresim = useHaptics();
  const canli = useLive();
  const qte = useQte();
  const hafif = useLowPerf();
  const bildirim = useNotifyState();
  const off = useOfflineStatus();
  const web = Platform.OS === 'web';
  const surum = web ? off?.surum : `${Application.nativeApplicationVersion ?? ''} (${Application.nativeBuildVersion ?? '-'})`;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[st.sheet, { paddingBottom: 12 + ins.bottom }]}>
          <LinearGradient colors={['#1d0a0f', '#0d0e12']} style={st.head}>
            <View style={st.handle} />
            <View style={st.headRow}>
              <View style={st.headIcon}>
                <Icon name="cog" size={20} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.title, SLANT]}>{L("Ayarlar").toLocaleUpperCase(LOC)}</Text>
                <Text style={st.headSub}>{L("Oyun deneyimini kendine göre ayarla")}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={st.close}>
                <Icon name="close" size={20} color={C.text} />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
            <Text style={st.groupTitle}>{L("DİL")}</Text>
            <View style={st.langGrid}>
              {LANGS.filter((l) => l.hazir).map((l) => {
                const on = l.id === LANG;
                return (
                  <Pressable key={l.id} disabled={on} onPress={() => setLang(l.id)} style={({ pressed }) => [st.lang, on && st.langOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <Text style={st.flag}>{l.bayrak}</Text>
                    <Text style={[st.langText, on && { color: C.gold }]} numberOfLines={1}>
                      {l.ad}
                    </Text>
                    {on ? <Icon name="check-circle" size={14} color={C.gold} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Group title={L("SES VE TİTREŞİM")}>
              <Row icon={ses.muzik ? 'music' : 'music-off'} color="#c86bff" title={L("Müzik")} sub={L("Menü ve giriş müzikleri")} on={ses.muzik} onPress={() => setSoundSettings({ muzik: !ses.muzik })} />
              <Row icon={ses.efekt ? 'volume-high' : 'volume-off'} color={C.blue} title={L("Efektler")} sub={L("Yumruk, seyirci ve gong sesleri")} on={ses.efekt} onPress={() => setSoundSettings({ efekt: !ses.efekt })} />
              <Row icon={spiker ? 'microphone-variant' : 'microphone-variant-off'} color={C.orange} title={L("Spiker")} sub={L("Anons ve maç anlatımı sesli okunur")} on={spiker} onPress={() => setAnnouncer(!spiker)} />
              <Row icon={titresim ? 'vibrate' : 'vibrate-off'} color={C.green} title={L("Titreşim")} sub={L("Darbelerde ve önemli anlarda titreşim")} on={titresim} onPress={() => setHaptics(!titresim)} last />
            </Group>

            <Group title={L("DÖVÜŞ")}>
              <Row icon={canli ? 'gamepad-variant' : 'eye'} color={C.red} title={L("Canlı dövüş")} sub={canli ? L("Rauntları gerçek zamanlı kendin oynarsın") : L("Planını seçer, dövüşü izlersin (taktik izle)")} on={canli} onPress={() => setLive(!canli)} />
              <Row icon={qte ? 'gesture-tap' : 'gesture-tap-hold'} color={C.gold} title={L("Dövüşte elle oyna")} sub={L("Kritik anlarda mini oyunlar çıkar; kapalıyken otomatik geçer")} on={qte} onPress={() => setQte(!qte)} last={web} />
              {!web ? (
                <Row icon={hafif ? 'speedometer-slow' : 'speedometer'} color="#5ad1c8" title={L("Hafif görüntü")} sub={L("Eski telefonlarda daha akıcı dövüş; gerekirse kendiliğinden açılır")} on={hafif} onPress={() => setLowPerf(!hafif)} last />
              ) : null}
            </Group>

            {NOTIFY ? (
              <Group title={L("BİLDİRİMLER")}>
                <Row
                  icon={bildirim === 'acik' ? 'bell-ring' : 'bell-off'}
                  color={C.orange}
                  title={L("Hatırlatmalar")}
                  sub={L("Günün Dövüşü ve serin için günde en fazla bir hatırlatma")}
                  on={bildirim === 'acik'}
                  onPress={() => void (bildirim === 'acik' ? disableNotifications() : enableNotifications())}
                  last
                />
              </Group>
            ) : null}

            <Group title={L("KARİYER VE DESTEK")}>
              <View style={{ padding: 12, gap: 10 }}>
                <ImportCard canImport={canImport} onImport={onImport} />
                <FeedbackRow />
              </View>
            </Group>

            {adPrivacyRequired() || privacyUrl(web) ? (
              <Group title={L("GİZLİLİK")}>
                {privacyUrl(web) ? <Row icon="shield-lock-outline" color={C.dim} title={L("Gizlilik politikası")} sub={L("Hangi verilerin nasıl kullanıldığı")} onPress={() => void Linking.openURL(privacyUrl(web)!)} last={!adPrivacyRequired()} /> : null}
                {adPrivacyRequired() ? <Row icon="account-cog-outline" color={C.dim} title={L("Reklam gizlilik ayarları")} sub={L("Kişiselleştirilmiş reklam iznini değiştir")} onPress={() => void showAdPrivacyOptions()} last /> : null}
              </Group>
            ) : null}

            <View style={st.foot}>
              {off?.durum === 'hazir' ? (
                <View style={st.offline}>
                  <Icon name="cloud-check" size={13} color={C.green} />
                  <Text style={st.offlineText}>{L("Çevrimdışı oynamaya hazır")}</Text>
                </View>
              ) : null}
              <Text style={st.version}>YOL · {L("KAFESTEN KEMERE")}{surum ? ` · ${surum}` : ''}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { maxHeight: '90%', backgroundColor: '#0d0e12', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: '#2a2c33', overflow: 'hidden' },
  head: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff10' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', marginBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '55', alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  headSub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center' },
  groupTitle: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.8, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: '#14151a', borderRadius: 16, borderWidth: 1, borderColor: '#24262d', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: '#ffffff0c' },
  rowIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  rowSub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 1 },
  track: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  lang: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#14151a', borderWidth: 1, borderColor: '#24262d', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 11 },
  langOn: { borderColor: C.gold, backgroundColor: C.gold + '14' },
  flag: { fontSize: 18 },
  langText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  foot: { alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 6 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offlineText: { color: C.green, fontFamily: F.semi, fontSize: 11 },
  version: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
});
