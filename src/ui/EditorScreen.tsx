// Editör ekranı: organizasyon adları ve UCC kadrosu (herkese açık), kariyer düzenleme (Şampiyon Paketi), paylaşılabilir kod.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { sfx } from '../audio';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
import { editCount, editorCode, emptyEditor, origOrg, readEditorCode, renameInState, rosterRefs, type EditorData, type StarEdit } from '../engine/editor';
import { STAT_KEYS, STAT_LABELS, type Background, type GameState, type OrgId, type WeightClass } from '../engine/types';
import { UCC_WOMEN_CLASSES } from '../engine/uccRoster';
import { editorData, setEditor, useEditor } from '../editor';
import { L, LOC } from '../i18n';
import { openShop, PURCHASES, usePremium } from '../monetization';
import type { Slot } from '../storage';
import { Button, CageBg, Card, Icon, Screen, SLANT } from './components';
import { C, F, R } from './theme';

type Tab = 'org' | 'ucc' | 'kariyer' | 'paylas';
const ORG_IDS: OrgId[] = ['amator', 'cfc', 'oktagon', 'pfl', 'one', 'mvp', 'dwcs', 'ufc'];

export function EditorScreen({ saves, onSave, onExit }: { saves: (GameState | null)[]; onSave: (slot: Slot, g: GameState) => void; onExit: () => void }) {
  const data = useEditor();
  const [tab, setTab] = useState<Tab>('org');
  const [note, setNote] = useState('');
  /** Kayıtlı kariyerlerdeki UCC yıldızlarını yeni adlara çeker */
  const syncSaves = () =>
    saves.forEach((s, i) => {
      if (!s) return;
      const g = JSON.parse(JSON.stringify(s)) as GameState;
      if (renameInState(g)) onSave((i + 1) as Slot, g);
    });
  const commit = (next: EditorData, msg: string) => {
    setEditor(next);
    syncSaves();
    sfx('click');
    setNote(msg);
  };
  const tabs: [Tab, string][] = [
    ['org', L("Organizasyonlar")],
    ['ucc', L("UCC Kadrosu")],
    ['kariyer', L("Kariyerim 👑")],
    ['paylas', L("Paylaş")],
  ];
  return (
    <Screen footer={<Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />}>
      <LinearGradient colors={['#1d1406', '#0e0f12', '#08090b']} locations={[0, 0.6, 1]} style={e.hero}>
        <CageBg opacity={0.05} />
        <Icon name="pencil-ruler" size={32} color={C.gold} />
        <Text style={[e.title, SLANT]}>{L("EDİTÖR")}</Text>
        <Text style={e.lead}>{L("Organizasyonların ve UCC yıldızlarının adını istediğin gibi değiştir. Düzenlemelerini kodla paylaş ya da arkadaşının kodunu yükle.")}</Text>
        <Text style={e.count}>{L("{0} düzenleme", [editCount(data)])}</Text>
      </LinearGradient>
      <View style={e.tabs}>
        {tabs.map(([k, t]) => (
          <Pressable key={k} onPress={() => (setTab(k), setNote(''))} style={[e.tab, tab === k && e.tabOn]}>
            <Text style={[e.tabText, tab === k && { color: '#1f1605' }]} numberOfLines={1} adjustsFontSizeToFit>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      {note ? <Text style={e.note}>{note}</Text> : null}
      {tab === 'org' ? <OrgTab key={JSON.stringify(data.org)} data={data} onSave={(d) => commit(d, L("Organizasyon adları kaydedildi."))} /> : null}
      {tab === 'ucc' ? <UccTab data={data} onSave={(d) => commit(d, L("Kadro kaydedildi."))} /> : null}
      {tab === 'kariyer' ? <CareerTab saves={saves} onSave={onSave} setNote={setNote} /> : null}
      {tab === 'paylas' ? <ShareTab data={data} onLoad={(d) => commit(d, L("Editör kodu yüklendi."))} onReset={() => commit(emptyEditor(), L("Bütün düzenlemeler sıfırlandı."))} /> : null}
    </Screen>
  );
}

// ---------- Organizasyonlar ----------

function OrgTab({ data, onSave }: { data: EditorData; onSave: (d: EditorData) => void }) {
  const [org, setOrg] = useState(data.org);
  const set = (k: OrgId, f: 'ad' | 'kisa', v: string) => setOrg({ ...org, [k]: { ...org[k], [f]: v } });
  return (
    <>
      {ORG_IDS.map((k) => (
        <Card key={k}>
          <Text style={e.kicker}>{origOrg(k).ad.toLocaleUpperCase(LOC)}</Text>
          <Field label={L("Ad")} value={org[k]?.ad ?? ''} placeholder={origOrg(k).ad} max={32} onChange={(v) => set(k, 'ad', v)} />
          <Field label={L("Kısa ad")} value={org[k]?.kisa ?? ''} placeholder={origOrg(k).kisa} max={10} onChange={(v) => set(k, 'kisa', v)} />
        </Card>
      ))}
      <Button label={L("Kaydet")} icon="content-save" tone="gold" onPress={() => onSave({ ...editorData(), org })} />
    </>
  );
}

// ---------- UCC Kadrosu ----------

const MEN_CLASSES = Object.keys(WEIGHT_CLASSES) as WeightClass[];

function UccTab({ data, onSave }: { data: EditorData; onSave: (d: EditorData) => void }) {
  const [kadin, setKadin] = useState(false);
  const classes = kadin ? UCC_WOMEN_CLASSES : MEN_CLASSES;
  const [siklet, setSiklet] = useState<WeightClass>(classes[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [ucc, setUcc] = useState<Record<string, StarEdit>>(data.ucc);
  const list = rosterRefs().filter((r) => r.kadin === kadin && r.siklet === siklet);
  const set = (key: string, f: keyof StarEdit, v: string) => setUcc({ ...ucc, [key]: { ...ucc[key], [f]: v } });
  return (
    <>
      <View style={e.chips}>
        {[false, true].map((k) => (
          <Chip key={String(k)} label={k ? L("Kadın") : L("Erkek")} on={kadin === k} onPress={() => (setKadin(k), setSiklet((k ? UCC_WOMEN_CLASSES : MEN_CLASSES)[0]), setOpen(null))} />
        ))}
      </View>
      <View style={e.chips}>
        {classes.map((c) => (
          <Chip key={c} label={WEIGHT_CLASSES[c].ad} on={siklet === c} onPress={() => (setSiklet(c), setOpen(null))} />
        ))}
      </View>
      {list.map((r, i) => {
        const ed = ucc[r.key] ?? {};
        const isOpen = open === r.key;
        const shown = `${ed.ad || r.orig.ad} ${ed.soyad || r.orig.soyad}`;
        const changed = Object.values(ed).some(Boolean);
        return (
          <Pressable key={r.key} onPress={() => setOpen(isOpen ? null : r.key)} style={[e.star, changed && { borderColor: C.goldDeep }]}>
            <View style={e.starHead}>
              <Text style={e.rank}>{i === 0 ? '🏆' : `#${i}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={e.starName} numberOfLines={1}>
                  {shown}
                </Text>
                <Text style={e.faint} numberOfLines={1}>
                  “{ed.lakap || r.orig.lakap}” · {L(ed.uyruk || r.orig.uyruk)} · {BACKGROUNDS[(ed.stil as Background) || r.orig.stil]?.ad}
                </Text>
              </View>
              <Icon name={isOpen ? 'chevron-up' : 'pencil'} size={18} color={changed ? C.gold : C.faint} />
            </View>
            {isOpen ? (
              <View style={{ marginTop: 8 }}>
                <Field label={L("Ad")} value={ed.ad ?? ''} placeholder={r.orig.ad} max={20} onChange={(v) => set(r.key, 'ad', v)} />
                <Field label={L("Soyad")} value={ed.soyad ?? ''} placeholder={r.orig.soyad} max={24} onChange={(v) => set(r.key, 'soyad', v)} />
                <Field label={L("Lakap")} value={ed.lakap ?? ''} placeholder={r.orig.lakap} max={28} onChange={(v) => set(r.key, 'lakap', v)} />
                <Field label={L("Ülke")} value={ed.uyruk ?? ''} placeholder={L(r.orig.uyruk)} max={24} onChange={(v) => set(r.key, 'uyruk', v)} />
                <Text style={e.label}>{L("STİL")}</Text>
                <View style={e.chips}>
                  {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
                    <Chip key={b} label={BACKGROUNDS[b].ad} on={(ed.stil || r.orig.stil) === b} onPress={() => setUcc({ ...ucc, [r.key]: { ...ed, stil: b } })} />
                  ))}
                </View>
                {changed ? (
                  <Pressable
                    onPress={() => {
                      const n = { ...ucc };
                      delete n[r.key];
                      setUcc(n);
                    }}
                    hitSlop={6}
                  >
                    <Text style={e.link}>{L("Orijinale döndür")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <Button label={L("Kaydet")} icon="content-save" tone="gold" onPress={() => onSave({ ...editorData(), ucc })} />
    </>
  );
}

// ---------- Kariyerim (Şampiyon Paketi) ----------

function CareerTab({ saves, onSave, setNote }: { saves: (GameState | null)[]; onSave: (slot: Slot, g: GameState) => void; setNote: (s: string) => void }) {
  const premium = usePremium();
  const slots = saves.map((s, i) => [s, (i + 1) as Slot] as const).filter(([s]) => !!s);
  const [slot, setSlot] = useState<Slot | null>(slots[0]?.[1] ?? null);
  if (PURCHASES && !premium)
    return (
      <LinearGradient colors={['#2e2206', '#0e0c07']} style={e.lock}>
        <Icon name="crown" size={28} color={C.gold} />
        <Text style={e.lockTitle}>{L("Kariyer editörü Şampiyon Paketi'nde")}</Text>
        <Text style={e.lead}>{L("Kendi dövüşçünün adını ve lakabını, rakiplerinin isimlerini ve istatistikleri değiştirmek Şampiyon Paketi ya da Tam Paket sahiplerine açık. Organizasyon ve UCC kadrosu editörü herkese ücretsiz.")}</Text>
        <Button label={L("Paketlere bak")} icon="crown" tone="gold" onPress={() => openShop('editor')} />
      </LinearGradient>
    );
  if (!slots.length) return <Text style={e.lead}>{L("Düzenlenecek kariyer yok. Önce bir kariyer başlat.")}</Text>;
  const s = saves[(slot ?? slots[0][1]) - 1]!;
  return (
    <>
      <View style={e.chips}>
        {slots.map(([g, k]) => (
          <Chip key={k} label={`${k}. ${g!.fighter.soyad}`} on={slot === k} onPress={() => setSlot(k)} />
        ))}
      </View>
      <CareerEdit
        key={`${slot}-${s.hafta}`}
        s={s}
        onSave={(g) => {
          onSave(slot ?? slots[0][1], g);
          sfx('click');
          setNote(g.editlendi ? L("Kariyer kaydedildi. İstatistikler değiştiği için bu kariyer artık başarım kazanmaz.") : L("Kariyer kaydedildi."));
        }}
      />
    </>
  );
}

function CareerEdit({ s, onSave }: { s: GameState; onSave: (g: GameState) => void }) {
  const [g, setG] = useState<GameState>(() => JSON.parse(JSON.stringify(s)) as GameState);
  const [statsTouched, setStatsTouched] = useState(false);
  const upd = (f: (x: GameState) => void) =>
    setG((cur) => {
      const n = JSON.parse(JSON.stringify(cur)) as GameState;
      f(n);
      return n;
    });
  const rivals = [...(g.bolum?.sampiyon ? [g.bolum.sampiyon] : []), ...(g.bolum?.liste ?? []), ...(g.rakipler ?? [])].filter((o, i, a) => a.findIndex((x) => x.id === o.id) === i).slice(0, 14);
  return (
    <>
      <Card>
        <Text style={e.kicker}>{L("DÖVÜŞÇÜN")}</Text>
        <Field label={L("Ad")} value={g.fighter.ad} max={20} onChange={(v) => upd((x) => (x.fighter.ad = v))} />
        <Field label={L("Soyad")} value={g.fighter.soyad} max={24} onChange={(v) => upd((x) => (x.fighter.soyad = v))} />
        <Field label={L("Lakap")} value={g.fighter.lakap} max={28} onChange={(v) => upd((x) => (x.fighter.lakap = v))} />
      </Card>
      <Card accent={C.red}>
        <Text style={e.kicker}>{L("İSTATİSTİKLER")}</Text>
        <Text style={[e.faint, { marginBottom: 8 }]}>{L("Değiştirirsen bu kariyer artık başarım kazanmaz ve oynayarak açılan ödüllerde sayılmaz.")}</Text>
        {STAT_KEYS.map((k) => (
          <View key={k} style={e.statRow}>
            <Text style={e.statName}>{STAT_LABELS[k]}</Text>
            <Pressable onPress={() => (setStatsTouched(true), upd((x) => (x.fighter.stats[k] = Math.max(1, x.fighter.stats[k] - 1))))} style={e.step} hitSlop={4}>
              <Icon name="minus" size={16} color={C.text} />
            </Pressable>
            <Text style={e.statVal}>{g.fighter.stats[k]}</Text>
            <Pressable onPress={() => (setStatsTouched(true), upd((x) => (x.fighter.stats[k] = Math.min(99, x.fighter.stats[k] + 1))))} style={e.step} hitSlop={4}>
              <Icon name="plus" size={16} color={C.text} />
            </Pressable>
          </View>
        ))}
      </Card>
      {rivals.length ? (
        <Card>
          <Text style={e.kicker}>{L("RAKİPLER")}</Text>
          {rivals.map((o) => (
            <View key={o.id} style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ flex: 1 }}>
                <Field label={o.champion ? L("Şampiyon") : o.rank ? `#${o.rank}` : ''} value={o.ad} max={20} onChange={(v) => upd((x) => renameRival(x, o.id, 'ad', v))} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label=" " value={o.soyad} max={24} onChange={(v) => upd((x) => renameRival(x, o.id, 'soyad', v))} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <Button
        label={L("Kariyeri kaydet")}
        icon="content-save"
        tone="gold"
        onPress={() => {
          const n = JSON.parse(JSON.stringify(g)) as GameState;
          for (const f of ['ad', 'soyad'] as const) if (!n.fighter[f].trim()) n.fighter[f] = s.fighter[f];
          if (statsTouched) n.editlendi = true;
          onSave(n);
        }}
      />
    </>
  );
}

/** Aynı rakip birden çok listede olabilir (bölüm, kalıcı rakipler): hepsinde değişir */
function renameRival(g: GameState, id: string, f: 'ad' | 'soyad', v: string) {
  for (const o of [g.bolum?.sampiyon, ...(g.bolum?.liste ?? []), ...(g.rakipler ?? [])]) if (o && o.id === id) o[f] = v;
}

// ---------- Paylaş ----------

function ShareTab({ data, onLoad, onReset }: { data: EditorData; onLoad: (d: EditorData) => void; onReset: () => void }) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const code = editorCode(data);
  const n = editCount(data);
  return (
    <>
      <Card accent={C.gold}>
        <Text style={e.kicker}>{L("EDİTÖR KODUN")}</Text>
        <Text style={e.lead}>{n ? L("{0} düzenleme bu kodda. Paylaş; arkadaşların tek dokunuşla yüklesin.", [n]) : L("Henüz düzenleme yok. Organizasyon ya da kadro düzenleyince kodun burada oluşur.")}</Text>
        {n ? (
          <>
            <Text selectable style={e.code} numberOfLines={4}>
              {code}
            </Text>
            <Button label={L("Kodu paylaş")} icon="share-variant" tone="gold" onPress={() => void Share.share({ message: L("YOL için editör kodum ({0} düzenleme). Oyunda Editör > Paylaş'a yapıştır: {1}", [n, code]) })} />
          </>
        ) : null}
      </Card>
      <Card>
        <Text style={e.kicker}>{L("KOD YÜKLE")}</Text>
        <TextInput value={input} onChangeText={(v) => (setInput(v), setErr(''))} placeholder="YOLED1:…" placeholderTextColor={C.faint} style={[e.input, { minHeight: 70 }]} multiline autoCapitalize="none" autoCorrect={false} />
        {err ? <Text style={[e.faint, { color: C.red }]}>{err}</Text> : null}
        <Button
          label={L("Yükle")}
          icon="download"
          tone="ghost"
          onPress={() => {
            // Mesajın içinden kodu ayıkla (paylaşım metniyle birlikte yapıştırılmış olabilir)
            const m = input.match(/YOLED1:[A-Za-z0-9+/=_-]+/);
            const d = m ? readEditorCode(m[0]) : null;
            if (!d) return setErr(L("Kod geçersiz."));
            setInput('');
            onLoad(d);
          }}
        />
      </Card>
      {n ? (
        sure ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label={L("Evet, sıfırla")} tone="red" onPress={() => (setSure(false), onReset())} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={L("Vazgeç")} tone="ghost" onPress={() => setSure(false)} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setSure(true)} hitSlop={6} style={{ alignSelf: 'center', marginTop: 6 }}>
            <Text style={e.link}>{L("Bütün düzenlemeleri sıfırla")}</Text>
          </Pressable>
        )
      ) : null}
    </>
  );
}

// ---------- Parçalar ----------

function Field({ label, value, placeholder, max, onChange }: { label: string; value: string; placeholder?: string; max: number; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 8 }}>
      {label ? <Text style={e.label}>{label.toLocaleUpperCase(LOC)}</Text> : null}
      <TextInput value={value} onChangeText={(v) => onChange(v.slice(0, max))} placeholder={placeholder} placeholderTextColor={C.faint} style={e.input} autoCorrect={false} maxLength={max} />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[e.chip, on && e.chipOn]}>
      <Text style={[e.chipText, on && { color: '#1f1605' }]}>{label}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: C.goldDeep, padding: 16, alignItems: 'center', gap: 6, marginBottom: 12, overflow: 'hidden' },
  title: { color: C.text, fontFamily: F.display, fontSize: 28 },
  lead: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  count: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.2 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center', backgroundColor: C.card },
  tabOn: { backgroundColor: C.gold, borderColor: C.gold },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  note: { color: C.green, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  label: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  input: { backgroundColor: '#0d0f13', borderWidth: 1, borderColor: C.border, borderRadius: R, color: C.text, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, paddingVertical: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12.5 },
  star: { borderWidth: 1, borderColor: C.border, borderRadius: R + 2, padding: 12, marginBottom: 8, backgroundColor: C.card },
  starHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 30, color: C.gold, fontFamily: F.display, fontSize: 14, textAlign: 'center' },
  starName: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  faint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  link: { color: C.faint, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  lock: { borderRadius: R + 4, borderWidth: 1, borderColor: C.gold, padding: 16, alignItems: 'center', gap: 8 },
  lockTitle: { color: C.text, fontFamily: F.display, fontSize: 18, textAlign: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  statName: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
  step: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff0a' },
  statVal: { width: 34, textAlign: 'center', color: C.gold, fontFamily: F.display, fontSize: 18 },
  code: { color: C.text, fontFamily: F.semi, fontSize: 11, backgroundColor: '#0d0f13', borderRadius: R, padding: 10, marginBottom: 8 },
});
