// Efsane Yolları: menüdeki efsane listesi (başlatma) ve kariyerde süren bölüm kartı + bölüm girişi.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cosmeticById } from '../engine/cosmetics';
import { currentChapter, dismissLegendIntro, LEGEND_IDS, LEGENDS, legendMaxStars, legendName, legendStars, noteOpen, openNote, type Chapter, type LegendId, type LegendRun } from '../engine/legendRun';
import { buy, MONETIZATION, PURCHASES, restorePurchases, useOwned, usePrice } from '../monetization';
import { LEGENDS_SKU } from '../monetization/skus';
import { AdOffer } from './AdOffer';
import { ShareButton } from '../share/ShareButton';
import { legendCard } from '../share/build';
import { checkpointOf, restoreInto, useCheckpoints } from '../legendCheckpoint';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { useLegendBest } from '../legendPrefs';
import { Button, Icon, SLANT, upName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

type Act = (fn: (s: GameState) => void) => void;
export type LegendName = { ad: string; soyad: string; lakap: string };

const starsOf = (r: LegendRun, ch: Chapter) => r.yildiz[ch.id] ?? [];

function Stars({ n, max = 3, size = 14 }: { n: number; max?: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name={i < n ? 'star' : 'star-outline'} size={size} color={i < n ? C.gold : C.faint} />
      ))}
    </View>
  );
}

// ---------- Menü: efsane listesi ----------

/** Efsane açık mı: ücretsizler, web (satın alma yok) ya da Efsaneler Paketi sahipleri. */
export function useLegendUnlocked() {
  const owned = useOwned();
  return (id: LegendId) => LEGENDS[id].ucretsiz || !PURCHASES || owned.has(LEGENDS_SKU);
}

export function LegendList({ canStart, onStart }: { canStart: boolean; onStart: (id: LegendId, isim: LegendName) => void }) {
  const best = useLegendBest();
  const [open, setOpen] = useState<LegendId | null>(null);
  const unlocked = useLegendUnlocked();
  const anyLocked = LEGEND_IDS.some((id) => !unlocked(id));
  return (
    <>
      {anyLocked ? <LegendPack /> : null}
      <LinearGradient colors={['#1d1606', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
        <Text style={st.heroKicker}>{L("HİKÂYE MODU")}</Text>
        <Text style={st.heroText}>{L("Kafesin en büyük hikâyelerini yeniden yaz. Her bölüm efsanenin hayatından bir dönem; yıldızlar tarihe ne kadar sadık kaldığını gösterir.")}</Text>
      </LinearGradient>
      {LEGEND_IDS.map((id) => {
        const d = LEGENDS[id];
        const b = best[id];
        const isOpen = open === id;
        return (
          <View key={id} style={[st.card, { borderColor: isOpen ? d.renk : C.border }, !d.oynanabilir && { opacity: 0.6 }]}>
            <Pressable disabled={!d.oynanabilir} onPress={() => setOpen(isOpen ? null : id)} style={st.cardHead}>
              <FighterAvatar look={d.gorunum} size={62} ring={d.renk} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={st.nameRow}>
                  <Text style={[st.name, SLANT]}>
                    {d.bayrak} {upName(legendName(d), d.uyruk)}
                  </Text>
                  {d.oynanabilir ? (
                    d.ucretsiz ? (
                      <Text style={[st.badge, { color: C.green, borderColor: C.green + '88' }]}>{L("ÜCRETSİZ")}</Text>
                    ) : !unlocked(id) ? (
                      <Text style={[st.badge, { color: C.gold, borderColor: C.gold + '88' }]}>{L("🔒 PAKET")}</Text>
                    ) : null
                  ) : (
                    <Text style={[st.badge, { color: C.faint, borderColor: C.faint }]}>{L("YAKINDA")}</Text>
                  )}
                </View>
                <Text style={[st.ozet, { color: d.renk, fontWeight: '700' }]}>“{d.lakap()}”</Text>
                <Text style={st.ozet} numberOfLines={isOpen ? undefined : 2}>
                  {d.ozet()}
                </Text>
                <View style={st.tags}>
                  {d.etiketler().map((t) => (
                    <Text key={t} style={[st.tag, { borderColor: d.renk + '66' }]}>
                      {t}
                    </Text>
                  ))}
                </View>
                {d.oynanabilir ? (
                  <View style={st.bestRow}>
                    <Stars n={1} max={1} size={13} />
                    <Text style={st.bestText}>
                      {b ? L("En iyi: {0}/{1} yıldız", [b.yildiz, legendMaxStars(id)]) : L("{0} bölüm · {1} yıldız", [d.bolumler.length, legendMaxStars(id)])}
                      {b?.bitti ? ' · ✅' : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
              {d.oynanabilir ? <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.faint} /> : null}
            </Pressable>
            {isOpen ? <LegendDetail id={id} canStart={canStart} locked={!unlocked(id)} onStart={(isim) => onStart(id, isim)} /> : null}
          </View>
        );
      })}
    </>
  );
}

/** Efsaneler Paketi satın alma kutusu (liste başında ve kilitli efsanenin ayrıntısında). */
function LegendPack({ compact }: { compact?: boolean }) {
  const price = usePrice(LEGENDS_SKU);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const paid = LEGEND_IDS.filter((id) => !LEGENDS[id].ucretsiz).length;
  const chapters = LEGEND_IDS.filter((id) => !LEGENDS[id].ucretsiz).reduce((n, id) => n + LEGENDS[id].bolumler.length, 0);
  const purchase = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const r = await buy(LEGENDS_SKU);
    setBusy(false);
    if (r === 'hata') setMsg(L("Satın alma şu an yapılamadı. Biraz sonra tekrar dene."));
  };
  return (
    <LinearGradient colors={['#2a1d05', '#100c04']} style={[st.pack, compact && { marginBottom: 0 }]}>
      {!compact ? <Text style={st.packKicker}>{L("EFSANELER PAKETİ")}</Text> : null}
      <Text style={st.packText}>
        {L("{0} efsane, {1} bölüm, her efsaneye özel şort. Tek seferlik alım; sonra gelecek efsaneler de dahil.", [paid, chapters])}
      </Text>
      <Button label={price ? L("Paketi al · {0}", [price]) : L("Paketi al")} icon="crown" tone="gold" disabled={busy} onPress={purchase} />
      {!compact ? (
        <Pressable onPress={async () => setMsg((await restorePurchases()) ? L("Satın alımların geri yüklendi.") : L("Bu hesapta satın alma bulunamadı."))} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
          <Text style={st.link}>{L("Satın alımları geri yükle")}</Text>
        </Pressable>
      ) : null}
      {msg ? <Text style={[st.warn, { textAlign: 'center' }]}>{msg}</Text> : null}
    </LinearGradient>
  );
}

function LegendDetail({ id, canStart, locked, onStart }: { id: LegendId; canStart: boolean; locked: boolean; onStart: (isim: LegendName) => void }) {
  const d = LEGENDS[id];
  const [isim, setIsim] = useState<LegendName>({ ad: d.ad, soyad: d.soyad, lakap: d.lakap() });
  return (
    <View style={st.detail}>
      {d.bolumler.map((ch, i) => (
        <View key={ch.id} style={st.chRow}>
          <Text style={[st.chNo, { color: d.renk }]}>{i + 1}</Text>
          <Text style={st.chYear}>{ch.yil}</Text>
          <Text style={st.chName} numberOfLines={1}>
            {ch.baslik()}
          </Text>
        </View>
      ))}
      <Text style={st.label}>{L("DÖVÜŞÇÜNÜN ADI (İSTERSEN DEĞİŞTİR)")}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[st.input, { flex: 1, minWidth: 0, width: 0 }]} value={isim.ad} onChangeText={(ad) => setIsim({ ...isim, ad })} placeholder={L("Ad")} placeholderTextColor={C.faint} maxLength={18} />
        <TextInput style={[st.input, { flex: 1, minWidth: 0, width: 0 }]} value={isim.soyad} onChangeText={(soyad) => setIsim({ ...isim, soyad })} placeholder={L("Soyad")} placeholderTextColor={C.faint} maxLength={18} />
      </View>
      <TextInput style={st.input} value={isim.lakap} onChangeText={(lakap) => setIsim({ ...isim, lakap })} placeholder={L("Lakap")} placeholderTextColor={C.faint} maxLength={18} />
      {locked ? (
        <LegendPack compact />
      ) : (
        <>
          {!canStart ? <Text style={st.warn}>{L("Efsane yolunu başlatmak için boş bir kariyer yuvası gerekli.")}</Text> : null}
          <Button label={L("Hikâyeyi başlat")} icon="book-open-variant" tone="gold" disabled={!canStart} onPress={() => onStart(isim)} />
        </>
      )}
    </View>
  );
}

// ---------- Kariyer: bölüm kartı ----------

export function LegendHubCard({ s, act }: { s: GameState; act: Act }) {
  const [reread, setReread] = useState(false);
  const r = s.efsane;
  if (!r) return null;
  const d = LEGENDS[r.id];
  const ch = currentChapter(s);
  const showIntro = r.giris != null || reread;
  const introIdx = r.giris ?? r.bolum;
  return (
    <>
      <LinearGradient colors={[d.renk + '33', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hub, { borderColor: d.renk + '88' }]}>
        <View style={st.hubHead}>
          <Icon name="book-open-variant" size={16} color={C.gold} />
          <Text style={st.hubKicker}>
            {ch ? L("EFSANE YOLU · BÖLÜM {0}/{1} · {2}", [r.bolum + 1, d.bolumler.length, ch.yil]) : L("EFSANE YOLU TAMAMLANDI")}
          </Text>
          <Stars n={1} max={1} size={13} />
          <Text style={st.hubStars}>
            {legendStars(r)}/{legendMaxStars(r.id)}
          </Text>
        </View>
        <View style={st.track}>
          {d.bolumler.map((c, i) => (
            <View key={c.id} style={[st.seg, { backgroundColor: i < r.bolum ? (starsOf(r, c).length ? C.gold : C.faint) : i === r.bolum ? d.renk : '#ffffff14' }]} />
          ))}
        </View>
        {ch ? (
          <>
            <Text style={[st.hubTitle, SLANT]}>{ch.baslik().toLocaleUpperCase(LOC)}</Text>
            <Text style={st.hubPlace}>{ch.yer()}</Text>
            <View style={st.goal}>
              <Icon name="flag-checkered" size={16} color={C.gold} />
              <Text style={st.goalText}>{ch.hedef()}</Text>
              {ch.ilerleme?.(s) ? <Text style={st.goalProg}>{ch.ilerleme(s)}</Text> : null}
            </View>
            {ch.yildizlar.map((x, i) => {
              const ok = starsOf(r, ch).includes(i + 1);
              return (
                <View key={i} style={st.starRow}>
                  <Icon name={ok ? 'star' : 'star-outline'} size={15} color={ok ? C.gold : C.faint} />
                  <Text style={[st.starText, ok && { color: C.gold }]}>{x.ad()}</Text>
                </View>
              );
            })}
            {ch.ipucu ? <Text style={st.hint}>💡 {ch.ipucu()}</Text> : null}
            {ch.not ? (
              noteOpen(s, ch) || !MONETIZATION ? (
                <View style={st.note}>
                  <Text style={st.noteKicker}>{L("📋 HOCANIN NOTU · {0}", [s.takim.antrenor])}</Text>
                  <Text style={st.noteText}>{ch.not()}</Text>
                </View>
              ) : (
                <AdOffer icon="clipboard-text" title={L("Hocanın notu")} desc={L("{0} bu bölümün yıldızları için ayrıntılı taktiğini anlatsın.", [s.takim.antrenor])} onReward={() => act(openNote)} />
              )
            ) : null}
            <Pressable onPress={() => setReread(true)} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={st.link}>{L("Bölümün hikâyesini oku")}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={st.hint}>{L("Bütün bölümleri bitirdin. Kariyerin artık senin: istediğin kadar devam et.")}</Text>
        )}
        <ReplayOffers s={s} act={act} />
      </LinearGradient>
      {showIntro ? (
        <LegendIntro
          s={s}
          idx={introIdx}
          onClose={() => {
            setReread(false);
            if (r.giris != null) act(dismissLegendIntro);
          }}
        />
      ) : null}
    </>
  );
}

/** Bölümü yeniden oyna: önceki bölümün yıldızları eksikse ya da bu bölüm kötü gidiyorsa başına dön (ödüllü reklam). */
function ReplayOffers({ s, act }: { s: GameState; act: Act }) {
  useCheckpoints();
  const [onay, setOnay] = useState<'cur' | 'prev' | null>(null);
  const r = s.efsane!;
  const d = LEGENDS[r.id];
  const prev = checkpointOf(s, 'prev');
  const cur = checkpointOf(s, 'cur');
  const prevCh = prev ? d.bolumler[prev.bolum] : null;
  const showPrev = !!prev && !!prevCh && prev.bolum === r.bolum - 1 && starsOf(r, prevCh).length < 3;
  // Bu bölümde en az bir dövüş yapıldıysa baştan oynamak anlamlı
  const showCur = !!cur && cur.bolum === r.bolum && !r.bitti && s.gecmis.length > cur.s.gecmis.length;
  if (!showPrev && !showCur) return null;
  const go = (snap: GameState) => act((x) => restoreInto(x, snap));
  const offer = (which: 'cur' | 'prev', snap: GameState, title: string, desc: string) =>
    MONETIZATION ? (
      <AdOffer key={which} icon="restore" title={title} desc={desc} onReward={() => go(snap)} />
    ) : (
      <Pressable key={which} onPress={() => (onay === which ? go(snap) : setOnay(which))} style={st.replay}>
        <Icon name="restore" size={16} color={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={st.replayTitle}>{onay === which ? L("Emin misin? Tekrar dokun") : title}</Text>
          <Text style={st.replayDesc}>{desc}</Text>
        </View>
      </Pressable>
    );
  return (
    <View style={{ marginTop: 6 }}>
      {showPrev && prev && prevCh
        ? offer('prev', prev.s, L("Önceki bölümü yeniden oyna: {0}", [prevCh.baslik()]), L("Kaçırdığın yıldızlar için o bölümün başına dön. Kariyerin o ana geri sarılır; en iyi yıldız rekorun korunur."))
        : null}
      {showCur && cur ? offer('cur', cur.s, L("Bu bölümü baştan oyna"), L("Bölüm kötü mü gidiyor? Bölümün başına dön; en iyi yıldız rekorun korunur.")) : null}
    </View>
  );
}

function LegendIntro({ s, idx, onClose }: { s: GameState; idx: number; onClose: () => void }) {
  const ins = useSafeAreaInsets();
  const r = s.efsane!;
  const d = LEGENDS[r.id];
  const ch = d.bolumler[idx];
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalWrap}>
        <LinearGradient colors={['#15110a', '#08090b']} style={[st.modal, { marginTop: 20 + ins.top, marginBottom: 20 + ins.bottom }]}>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            {ch ? (
              <>
                <Text style={st.mKicker}>{L("BÖLÜM {0} · {1} · {2}", [idx + 1, ch.yil, ch.yer()])}</Text>
                <Text style={[st.mTitle, SLANT]}>{ch.baslik().toLocaleUpperCase(LOC)}</Text>
                {ch.giris().map((p, i) => (
                  <Text key={i} style={st.mPara}>
                    {p}
                  </Text>
                ))}
                <View style={st.mGoal}>
                  <Text style={st.mGoalKicker}>{L("HEDEF")}</Text>
                  <View style={st.starRow}>
                    <Icon name="star" size={15} color={C.gold} />
                    <Text style={[st.starText, { color: C.text }]}>{ch.hedef()}</Text>
                  </View>
                  {ch.yildizlar.map((x, i) => (
                    <View key={i} style={st.starRow}>
                      <Icon name="star-outline" size={15} color={C.gold} />
                      <Text style={st.starText}>{x.ad()}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={st.mKicker}>{L("EFSANE YOLU")}</Text>
                <Text style={[st.mTitle, SLANT]}>{L("{0}: TAMAMLANDI", [upName(legendName(d), d.uyruk)])}</Text>
                {d.final ? <Text style={st.mPara}>{d.final()}</Text> : null}
                {d.bolumler.map((c) => (
                  <View key={c.id} style={st.chRow}>
                    <Text style={st.chYear}>{c.yil}</Text>
                    <Text style={st.chName} numberOfLines={1}>
                      {c.baslik()}
                    </Text>
                    <Stars n={starsOf(r, c).length} />
                  </View>
                ))}
                <Text style={[st.mPara, { color: C.gold, marginTop: 10 }]}>
                  {L("Toplam {0}/{1} yıldız.", [legendStars(r), legendMaxStars(r.id)])}
                  {d.odulKozmetik && cosmeticById(d.odulKozmetik) ? ` ${L("Ödül: Dolap'ta yeni “{0}”.", [cosmeticById(d.odulKozmetik)!.ad])}` : ''}
                </Text>
              </>
            )}
            {idx > 0 ? (
              <View style={{ marginBottom: 8 }}>
                <ShareButton data={legendCard(s, ch ? idx - 1 : null)} label={ch ? L("Biten bölümü paylaş") : L("Hikâyeni paylaş")} />
              </View>
            ) : null}
            <Button label={ch ? L("Başla") : L("Devam")} icon="play" tone="gold" onPress={onClose} />
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 14, borderWidth: 1, borderColor: C.gold + '44', padding: 14, marginBottom: 12 },
  heroKicker: { color: C.gold, fontFamily: F.semi, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  heroText: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: 1, backgroundColor: C.card, marginBottom: 10, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: C.text, fontFamily: F.display, fontSize: 19 },
  badge: { fontFamily: F.semi, fontSize: 9, letterSpacing: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ozet: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tag: { color: C.text, fontFamily: F.medium, fontSize: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  bestText: { color: C.gold, fontFamily: F.semi, fontSize: 11 },
  detail: { borderTopWidth: 1, borderTopColor: C.border, padding: 12, paddingTop: 10 },
  chRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  chNo: { fontFamily: F.display, fontSize: 14, width: 16, textAlign: 'center' },
  chYear: { color: C.faint, fontFamily: F.semi, fontSize: 11, width: 36 },
  chName: { color: C.text, fontFamily: F.medium, fontSize: 13, flex: 1 },
  label: { color: C.faint, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.cardAlt, borderRadius: R, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 14, marginBottom: 8 },
  warn: { color: C.orange, fontFamily: F.body, fontSize: 12, marginBottom: 8 },
  hub: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  hubHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hubKicker: { color: C.gold, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5, flex: 1 },
  hubStars: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  track: { flexDirection: 'row', gap: 3, marginTop: 10, marginBottom: 10 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  hubTitle: { color: C.text, fontFamily: F.display, fontSize: 21 },
  hubPlace: { color: C.faint, fontFamily: F.medium, fontSize: 11, marginBottom: 8 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00000044', borderRadius: 10, padding: 10, marginBottom: 6 },
  goalText: { color: C.text, fontFamily: F.semi, fontSize: 13.5, flex: 1 },
  goalProg: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  starText: { color: C.dim, fontFamily: F.body, fontSize: 12.5, flex: 1 },
  replay: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.goldDeep, borderStyle: 'dashed', borderRadius: 12, padding: 10, marginTop: 6 },
  replayTitle: { color: C.gold, fontFamily: F.bold, fontSize: 13 },
  replayDesc: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  pack: { borderRadius: 14, borderWidth: 1, borderColor: C.gold + '66', padding: 14, marginBottom: 12, gap: 10 },
  packKicker: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 },
  packText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  note: { backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 10, padding: 10, marginTop: 8 },
  noteKicker: { color: C.gold, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.5 },
  noteText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 4 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 6 },
  link: { color: C.gold, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
  modalWrap: { flex: 1, backgroundColor: '#000000cc', paddingHorizontal: 16, justifyContent: 'center' },
  modal: { borderRadius: 16, borderWidth: 1, borderColor: C.gold + '55', maxHeight: '100%' },
  mKicker: { color: C.gold, fontFamily: F.semi, fontSize: 10, letterSpacing: 2 },
  mTitle: { color: C.text, fontFamily: F.display, fontSize: 26, marginTop: 4, marginBottom: 10 },
  mPara: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  mGoal: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 14, backgroundColor: '#00000055' },
  mGoalKicker: { color: C.faint, fontFamily: F.semi, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
});
