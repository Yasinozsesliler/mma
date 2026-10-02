import { L } from '../i18n';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { canUpgradeTech, MAX_TECH, TECH_KINDS, TECHNIQUES, techById, techCost, techLevel, upgradeTech, xpNeed } from '../engine/techniques';
import { canSign, defaultSignatureName, setSignature, SIGNATURE_LEVEL } from '../engine/signature';
import type { GameState } from '../engine/types';
import { Icon, Section, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

const KIND_COLOR = { sub: '#3aa8ff', vurus: C.red, ozel: C.gold } as const;

/** Bitiriş teknikleri: seviye, ustalık ve puanla geliştirme. */
export function TechniquePanel({ s, act }: { s: GameState; act: Act }) {
  const [all, setAll] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <>
      <Section>{L("BİTİRİŞ TEKNİKLERİ")}</Section>
      {s.imza ? (
        <View style={tp.sig}>
          <Text style={tp.sigKicker}>{L("✍️ İMZA HAREKETİN")}</Text>
          <Text style={tp.sigName}>“{s.imza.ad}”</Text>
          <Text style={tp.desc}>{L("{0} · bu hareketle {1} kez bitirdin", [techById(s.imza.teknik)?.ad ?? '', s.imza.sayi])}</Text>
        </View>
      ) : (
        <Text style={tp.hint}>{L("Bir tekniği {0}. ustalık seviyesine getirince ona kendi adını verip imza hareketin yapabilirsin.", [SIGNATURE_LEVEL])}</Text>
      )}
      <Text style={tp.hint}>
        
        {L("Bir maçı hangi hareketle bitirirsen o hareket ustalık kazanır. Teknik çalışması ve spar da ustalık verir. Özel hareketler dövüş sırasında riskli ama görkemli fırsatlar açar. Gelişim puanın:")}{' '}<Text style={{ color: C.gold }}>{s.puan}</Text>
      </Text>
      {TECH_KINDS.map((kind) => {
        const list = TECHNIQUES.filter((t) => t.tur === kind.id && (all || techLevel(s, t.id) > 0));
        if (!list.length) return null;
        const col = KIND_COLOR[kind.id];
        return (
          <View key={kind.id} style={tp.group}>
            <View style={tp.groupHead}>
              <Icon name={kind.ikon as IconName} size={14} color={col} />
              <Text style={[tp.groupTitle, { color: col }]}>{kind.ad}</Text>
            </View>
            {list.map((t) => {
              const sv = techLevel(s, t.id);
              const xp = s.teknik?.[t.id]?.xp ?? 0;
              const max = sv >= MAX_TECH;
              const can = canUpgradeTech(s, t.id);
              return (
                <View key={t.id} style={[tp.row, sv === 0 && { opacity: 0.75 }]}>
                  <View style={[tp.icon, { borderColor: col + '66', backgroundColor: col + '14' }]}>
                    <Icon name={t.ikon as IconName} size={18} color={sv ? col : C.faint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={tp.name}>{t.ad}</Text>
                    <View style={tp.pips}>
                      {Array.from({ length: MAX_TECH }, (_, i) => (
                        <View key={i} style={[tp.pip, i < sv && { backgroundColor: col, borderColor: col }]} />
                      ))}
                      {!max && sv > 0 ? <Text style={tp.xp}>{L("ustalık")}{' '}{xp}/{xpNeed(sv)}</Text> : null}
                    </View>
                    <Text style={tp.desc} numberOfLines={2}>
                      {t.aciklama}
                    </Text>
                  </View>
                  {canSign(s, t.id) && s.imza?.teknik !== t.id ? (
                    <Pressable
                      onPress={() => {
                        setNaming(naming === t.id ? null : t.id);
                        setName(defaultSignatureName(s, t.id));
                      }}
                      style={[tp.btn, { borderColor: C.gold }]}
                    >
                      <Text style={[tp.btnText, { color: C.gold }]}>{L("İMZA YAP")}</Text>
                    </Pressable>
                  ) : null}
                  {max ? (
                    <Text style={[tp.master, { color: col }]}>{L('USTA')}</Text>
                  ) : (
                    <Pressable disabled={!can} onPress={() => act((x) => upgradeTech(x, t.id))} style={[tp.btn, { borderColor: col }, !can && { opacity: 0.35 }]}>
                      <Text style={[tp.btnText, { color: col }]}>{sv ? L("GELİŞTİR") : L("ÖĞREN")}</Text>
                      <Text style={tp.btnCost}>{L('{0} puan', [techCost(sv)])}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
            {naming && list.some((t) => t.id === naming) ? (
              <View style={tp.nameBox}>
                <Text style={tp.desc}>{L("İmza hareketine bir isim ver:")}</Text>
                <TextInput value={name} onChangeText={setName} maxLength={32} style={tp.input} />
                <Pressable
                  onPress={() => {
                    const id = naming;
                    setNaming(null);
                    act((x) => setSignature(x, id, name));
                  }}
                  style={[tp.btn, { borderColor: C.gold, alignSelf: 'flex-end' }]}
                >
                  <Text style={[tp.btnText, { color: C.gold }]}>{L("KAYDET")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
      <Pressable onPress={() => setAll(!all)} style={tp.toggle}>
        <Text style={tp.toggleText}>{all ? L("SADECE BİLDİKLERİM") : L("TÜM TEKNİKLERİ GÖSTER")}</Text>
      </Pressable>
    </>
  );
}

const tp = StyleSheet.create({
  sig: { backgroundColor: '#1a150a', borderWidth: 1, borderColor: C.gold, borderRadius: R, padding: 12, gap: 2, marginBottom: 8 },
  sigKicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 1 },
  sigName: { color: C.text, fontFamily: F.display, fontSize: 18 },
  nameBox: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  input: { color: C.text, fontFamily: F.semi, fontSize: 15, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, backgroundColor: '#0f1014' },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  group: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  groupTitle: { fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  icon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 14 },
  pips: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  pip: { width: 14, height: 5, borderRadius: 2, borderWidth: 1, borderColor: C.border, backgroundColor: '#15161a' },
  xp: { color: C.faint, fontFamily: F.body, fontSize: 10, marginLeft: 6 },
  desc: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 15, marginTop: 3 },
  btn: { alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, minWidth: 74 },
  btnText: { fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  btnCost: { color: C.dim, fontFamily: F.body, fontSize: 10 },
  master: { fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  toggle: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
});
