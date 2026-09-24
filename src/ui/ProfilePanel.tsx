import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fullName } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { ACHIEVEMENTS, activeBelts, legacyScore, legacyTier } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { Belt } from './Belt';
import { Card, Icon, OctIcon, P, Pill, Section, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

export function ProfilePanel({ s, act }: { s: GameState; act: Act }) {
  const [bio, setBio] = useState(s.fighter.hakkinda ?? '');
  const [saved, setSaved] = useState(false);
  const score = legacyScore(s);
  const tier = legacyTier(score);
  const belts = s.kemerler ?? [];
  const aktif = activeBelts(s);
  const double = new Set(aktif.map((b) => `${b.org}`)).size < aktif.length;
  const earned = new Set(s.basarimlar ?? []);
  return (
    <>
      <LinearGradient colors={['#22060b', '#0c0d10']} style={pf.head}>
        <FighterAvatar look={s.fighter.gorunum} size={120} ring={aktif.length ? C.gold : C.red} />
        <View style={{ flex: 1 }}>
          <Text style={[pf.name, SLANT]}>{fullName(s.fighter).toLocaleUpperCase('tr-TR')}</Text>
          <Text style={pf.meta}>
            {s.rekor.g}-{s.rekor.m}-{s.rekor.b} · {s.fighter.yas} yaş · {s.fighter.memleket}
          </Text>
          <View style={pf.legacy}>
            <Text style={pf.legacyLabel}>EFSANE PUANI</Text>
            <Text style={[pf.legacyVal, SLANT, { color: tier.renk }]}>{score}</Text>
          </View>
          <Text style={[pf.tier, { color: tier.renk }]}>{tier.ad}</Text>
        </View>
      </LinearGradient>

      <Section>HAKKINDA</Section>
      <Card>
        <TextInput
          style={pf.input}
          value={bio}
          onChangeText={(t) => {
            setBio(t);
            setSaved(false);
          }}
          multiline
          maxLength={500}
          placeholder="Kendini anlat: felsefen, hedeflerin, taraftarlarına mesajın…"
          placeholderTextColor={C.faint}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={pf.meta}>{bio.length}/500</Text>
          <Pressable
            onPress={() => {
              act((x) => (x.fighter.hakkinda = bio.trim()));
              setSaved(true);
            }}
            style={({ pressed }) => [pf.save, pressed && { opacity: 0.7 }]}
          >
            <Icon name={saved ? 'check' : 'content-save'} size={14} color="#fff" />
            <Text style={pf.saveText}>{saved ? 'KAYDEDİLDİ' : 'KAYDET'}</Text>
          </Pressable>
        </View>
      </Card>

      <Section>ÖDÜL VİTRİNİ</Section>
      {double ? (
        <LinearGradient colors={['#4a3508', '#1a1508']} style={pf.double}>
          <Icon name="trophy-variant" size={22} color={C.gold} />
          <Text style={[pf.doubleText, SLANT]}>DOUBLE CHAMP · AYNI ANDA İKİ KEMER</Text>
        </LinearGradient>
      ) : null}
      {belts.length === 0 ? (
        <Card>
          <P dim style={{ marginBottom: 0 }}>
            Vitrin boş. İlk kemerin burada parlayacak.
          </P>
        </Card>
      ) : (
        belts
          .slice()
          .reverse()
          .map((b, i) => (
            <View key={i} style={[pf.belt, b.aktif && { borderColor: C.goldDeep }]}>
              <View style={{ alignItems: 'center' }}>
                <Belt org={b.org} siklet={b.siklet} width={280} dim={!b.aktif} />
              </View>
              <View style={pf.beltInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={[pf.beltTitle, SLANT]}>
                    {ORGS[b.org].kisa} · {WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase('tr-TR')}
                  </Text>
                  <Text style={pf.meta}>
                    {b.yas} yaşında kazanıldı · {b.savunma} savunma
                  </Text>
                </View>
                <Pill text={b.aktif ? 'AKTİF' : 'GEÇMİŞ'} icon={b.aktif ? 'crown' : 'history'} color={b.aktif ? C.gold : C.faint} />
              </View>
            </View>
          ))
      )}

      <Section>{`BAŞARIMLAR · ${earned.size}/${ACHIEVEMENTS.length}`}</Section>
      <View style={pf.grid}>
        {ACHIEVEMENTS.map((a) => {
          const ok = earned.has(a.id);
          return (
            <View key={a.id} style={[pf.ach, ok && { borderColor: C.goldDeep, backgroundColor: '#16110a' }]}>
              <OctIcon name={(ok ? a.ikon : 'lock') as IconName} color={ok ? C.gold : C.faint} size={38} />
              <Text style={[pf.achName, !ok && { color: C.faint }]} numberOfLines={1}>
                {a.ad}
              </Text>
              <Text style={pf.achDesc} numberOfLines={2}>
                {a.aciklama}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

const pf = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: R, borderWidth: 1, borderColor: '#3a1a20', padding: 14 },
  name: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  legacy: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  legacyLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  legacyVal: { fontFamily: F.display, fontSize: 30 },
  tier: { fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  input: { color: C.text, fontFamily: F.body, fontSize: 14, minHeight: 90, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  saveText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  double: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 10 },
  doubleText: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  belt: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  beltInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  beltTitle: { color: C.text, fontFamily: F.display, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ach: { width: '31.5%', alignItems: 'center', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 8, gap: 4 },
  achName: { color: C.gold, fontFamily: F.display, fontSize: 12, textAlign: 'center' },
  achDesc: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center', lineHeight: 13 },
});
