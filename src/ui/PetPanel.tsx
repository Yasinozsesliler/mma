import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { money } from '../engine/career';
import { adoptPet, PET_TYPES, petType, playWithPet, togglePremium, vetCost, vetVisit, weeklyPetCost, type Pet } from '../engine/pets';
import type { GameState } from '../engine/types';
import { Bar, Pill, Section, SLANT } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

export function PetBadge({ turId, size = 64 }: { turId: string; size?: number }) {
  const t = petType(turId);
  return (
    <View style={[pp.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: (t?.renk ?? '#888') + '33', borderColor: t?.renk ?? '#888' }]}>
      <Text style={{ fontSize: size * 0.55 }}>{t?.emoji ?? '🐾'}</Text>
    </View>
  );
}

function OwnedPet({ s, p, act, onMsg }: { s: GameState; p: Pet; act: Act; onMsg: (m: string) => void }) {
  const t = petType(p.tur)!;
  const played = p.sonOyun === s.hafta;
  return (
    <View style={[pp.card, p.hasta && { borderColor: C.red }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <PetBadge turId={p.tur} size={62} />
        <View style={{ flex: 1 }}>
          <Text style={[pp.name, SLANT]}>{p.ad.toLocaleUpperCase('tr-TR')}</Text>
          <Text style={pp.meta}>
            {t.ad} · Bakım {money(t.haftalik * (p.premium ? 2 : 1))}/hafta{p.premium ? ' · Premium mama' : ''}
          </Text>
          {p.hasta ? <Text style={[pp.meta, { color: C.red }]}>🤒 Hasta, veterinere götür!</Text> : null}
        </View>
      </View>
      <Bar value={p.mutluluk} color={p.mutluluk < 30 ? C.red : C.gold} label="Mutluluk" right={`${Math.round(p.mutluluk)}`} />
      <Bar value={p.saglik} color={p.saglik < 50 ? C.orange : C.green} label="Sağlık" right={`${Math.round(p.saglik)}`} />
      <View style={pp.actions}>
        <Pressable disabled={played} onPress={() => act((x) => onMsg(playWithPet(x, p.id)))} style={[pp.btn, played && { opacity: 0.35 }]}>
          <Text style={pp.btnText}>{played ? 'BU HAFTA OYNADI' : 'OYNA'}</Text>
        </Pressable>
        <Pressable onPress={() => act((x) => onMsg(vetVisit(x, p.id)))} style={[pp.btn, { backgroundColor: p.hasta ? C.red : C.cardAlt }]}>
          <Text style={pp.btnText}>VETERİNER {money(vetCost(p))}</Text>
        </Pressable>
        <Pressable onPress={() => act((x) => togglePremium(x, p.id))} style={[pp.btn, { backgroundColor: p.premium ? C.goldDeep : C.cardAlt }]}>
          <Text style={pp.btnText}>{p.premium ? 'PREMIUM ✓' : 'PREMIUM MAMA'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PetPanel({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const owned = s.hayvanlar ?? [];
  return (
    <>
      {owned.length ? (
        <>
          <Section>{`EVCİL HAYVANLARIN · ${money(weeklyPetCost(s))}/HAFTA`}</Section>
          {owned.map((p) => (
            <OwnedPet key={p.id} s={s} p={p} act={act} onMsg={onMsg} />
          ))}
        </>
      ) : null}
      <Section>SAHİPLEN</Section>
      <Text style={pp.note}>Mutlu bir hayvan kamp motivasyonu verir. Köpekler sabah koşusunda kondisyonu artırır. İhmal edilen hayvan mutsuz olur, hastalanır ve motivasyonunu düşürür.</Text>
      {PET_TYPES.map((t) => {
        const afford = s.para >= t.fiyat;
        const ad = names[t.id] ?? '';
        return (
          <View key={t.id} style={pp.card}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <PetBadge turId={t.id} size={58} />
              <View style={{ flex: 1 }}>
                <Text style={pp.name}>{t.ad}</Text>
                <Text style={pp.meta}>{t.aciklama}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <Pill text={t.tur} color={C.dim} />
              <Pill text={`Bakım ${money(t.haftalik)}/hafta`} icon="cash" color={C.orange} />
              {t.kondisyon ? <Pill text="Koşu ortağı: kondisyon kampı +%10" icon="run-fast" color={C.green} /> : null}
            </View>
            <View style={pp.adoptRow}>
              <TextInput
                style={pp.input}
                value={ad}
                onChangeText={(v) => setNames({ ...names, [t.id]: v })}
                placeholder="İsim ver…"
                placeholderTextColor={C.faint}
                maxLength={20}
              />
              <Pressable
                disabled={!afford || !ad.trim()}
                onPress={() => {
                  act((x) => onMsg(adoptPet(x, t.id, ad)));
                  setNames({ ...names, [t.id]: '' });
                }}
                style={[pp.adopt, (!afford || !ad.trim()) && { opacity: 0.35 }]}
              >
                <Text style={pp.btnText}>{afford ? `SAHİPLEN ${money(t.fiyat)}` : 'PARA YETMİYOR'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </>
  );
}

const pp = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  name: { color: C.text, fontFamily: F.display, fontSize: 18 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  note: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  btn: { backgroundColor: C.cardAlt, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 7, transform: [{ skewX: '-8deg' }] },
  btnText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
  adoptRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, backgroundColor: '#060607', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  adopt: { backgroundColor: C.red, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 9, transform: [{ skewX: '-8deg' }] },
});
