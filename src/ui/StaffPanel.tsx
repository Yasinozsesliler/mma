import { L, LOC } from '../i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { OWNERS, ownerRel } from '../engine/owners';
import { fireStaff, hireStaff, signingFee, STAFF, staffMember, TIER_NAMES, weeklyStaffCost, type StaffRole } from '../engine/staff';
import { currentOrg } from '../engine/character';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { Bar, OctIcon, Pill, Section, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

export function OwnerCard({ s }: { s: GameState }) {
  const org = currentOrg(s);
  const o = OWNERS[org];
  if (!o) return null;
  const rel = ownerRel(s);
  return (
    <View style={sf.owner}>
      <FighterAvatar look={lookFor({ id: `owner-${o.ad}`, uyruk: o.uyruk })} size={60} ring={C.gold} />
      <View style={{ flex: 1 }}>
        <Text style={sf.label}>{L("ORGANİZASYON PATRONU")}</Text>
        <Text style={[sf.name, SLANT]}>{o.ad.toLocaleUpperCase(LOC)}</Text>
        <Text style={sf.meta}>
          {o.unvan} · {o.tarz}
        </Text>
        <Bar value={(rel + 50)} color={rel >= 15 ? C.green : rel <= -15 ? C.red : C.gold} label={L("İlişki")} right={`${rel > 0 ? '+' : ''}${rel}`} />
        <Text style={sf.meta}>{L("İyi ilişki pazarlıkları kolaylaştırır ve kötü bir seride seni kovulmaktan korur.")}</Text>
      </View>
    </View>
  );
}

export function StaffPanel({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  return (
    <>
      <OwnerCard s={s} />
      <Section>{L("KADRO · HAFTALIK MAAŞ {0}", [money(weeklyStaffCost(s))])}</Section>
      {(Object.keys(STAFF) as StaffRole[]).map((r) => {
        const d = STAFF[r];
        const m = staffMember(s, r);
        return (
          <View key={r} style={[sf.card, m && { borderColor: C.green + '88' }]}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <OctIcon name={d.ikon as IconName} color={m ? C.green : C.dim} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={sf.role}>{d.ad}</Text>
                <Text style={sf.meta}>{m ? `${m.ad} · ${TIER_NAMES[m.seviye - 1]} · ${d.etki(m.seviye)}` : d.aciklama}</Text>
              </View>
              {m ? (
                <Pressable onPress={() => act((x) => onMsg(fireStaff(x, r)))} style={sf.fire}>
                  <Text style={sf.fireText}>{L("ÇIKAR")}</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={sf.tiers}>
              {[1, 2, 3].map((l) => {
                const cur = m?.seviye === l;
                const fee = signingFee(r, l);
                return (
                  <Pressable
                    key={l}
                    disabled={cur || s.para < fee}
                    onPress={() => act((x) => onMsg(hireStaff(x, r, l)))}
                    style={[sf.tier, cur && sf.tierOn, !cur && s.para < fee && { opacity: 0.35 }]}
                  >
                    <Text style={[sf.tierName, cur && { color: '#fff' }]}>{TIER_NAMES[l - 1].toLocaleUpperCase(LOC)}</Text>
                    <Text style={sf.tierSalary}>{money(d.maas[l - 1])}/hf</Text>
                    <Text style={sf.tierFx}>{d.etki(l)}</Text>
                    {!cur ? <Text style={sf.tierFee}>{L("İmza")}{' '}{money(fee)}</Text> : <Pill text={L("AKTİF")} color={C.green} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </>
  );
}

const sf = StyleSheet.create({
  owner: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#16110a', borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 6 },
  label: { color: C.gold, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 18 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  role: { color: C.text, fontFamily: F.display, fontSize: 17, textTransform: 'uppercase' },
  fire: { borderWidth: 1, borderColor: C.red, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5 },
  fireText: { color: C.red, fontFamily: F.display, fontSize: 11 },
  tiers: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tier: { flex: 1, backgroundColor: C.cardAlt, borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: 7, gap: 2 },
  tierOn: { backgroundColor: '#123322', borderColor: C.green },
  tierName: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 0.8 },
  tierSalary: { color: C.gold, fontFamily: F.display, fontSize: 14 },
  tierFx: { color: C.dim, fontFamily: F.body, fontSize: 10, lineHeight: 13 },
  tierFee: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
});
