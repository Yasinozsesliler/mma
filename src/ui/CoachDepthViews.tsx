// Antrenör Modu derinlik arayüzü: felsefe seçimi, üç itibar, maç kampı, ekip, uzmanlıklar, ezeli rakip,
// emeklilik ve Antrenör Onur Listesi. CoachScreen bu parçaları sekmelerine yerleştirir.
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { sfx } from "../audio";
import { addCoachLegacy, useCoachHof } from "../coachHof";
import type { Student } from "../engine/academy";
import { money } from "../engine/career";
import {
  AXES,
  AXIS_KEYS,
  CAMP_KEYS,
  CAMPS,
  canChangePhilosophy,
  canRetire,
  chooseCamp,
  choosePerk,
  fireStaff,
  hireStaff,
  itibar,
  legacyScore,
  legacyTitle,
  PERKS,
  PHILOSOPHIES,
  PHILOSOPHY_KEYS,
  retireCoach,
  RETIRE_YEAR,
  setPhilosophy,
  STAFF,
  STAFF_KEYS,
  staffSlots,
  staffWages,
  type CampKey,
  type CoachLegacy,
  type Perk,
  type Philosophy,
} from "../engine/coachDepth";
import { SKILL_MAX, type CoachSkill } from "../engine/coachMode";
import { COUNTRIES } from "../engine/data";
import type { GameState } from "../engine/types";
import { L, LOC } from "../i18n";
import { Bar, Button, Card, Icon, SLANT, type IconName } from "./components";
import type { Act } from "./GameScreens";
import { C, F, R } from "./theme";

// ---------- Üç itibar ----------

/** Hoca kartının altında: üç ince çubuk. */
export function AxesStrip({ s }: { s: GameState }) {
  const it = itibar(s);
  return (
    <View style={d.strip}>
      {AXIS_KEYS.map((k) => (
        <View key={k} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon
              name={AXES[k].ikon as IconName}
              size={11}
              color={AXES[k].renk}
            />
            <Text style={d.stripLab} numberOfLines={1}>
              {
                (
                  {
                    sadakat: L("SADAKAT"),
                    iliski: L("ORGANİZASYON"),
                    imaj: L("MEDYA"),
                  } as const
                )[k]
              }
            </Text>
          </View>
          <View style={d.track}>
            <View
              style={[
                d.fill,
                {
                  width: `${Math.round(it[k])}%`,
                  backgroundColor: AXES[k].renk,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function AxesCard({ s }: { s: GameState }) {
  const it = itibar(s);
  return (
    <Card>
      <Text style={d.kicker}>{L("İTİBAR")}</Text>
      {AXIS_KEYS.map((k) => (
        <View key={k} style={{ marginBottom: 6 }}>
          <Bar
            value={it[k]}
            color={AXES[k].renk}
            label={AXES[k].ad()}
            right={String(Math.round(it[k]))}
          />
          <Text style={d.meta}>{AXES[k].aciklama()}</Text>
        </View>
      ))}
    </Card>
  );
}

// ---------- Felsefe ----------

function PhilOption({
  f,
  on,
  onPress,
}: {
  f: Philosophy;
  on?: boolean;
  onPress?: () => void;
}) {
  const p = PHILOSOPHIES[f];
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        d.phil,
        { borderColor: on ? p.renk : C.border },
        on && { backgroundColor: p.renk + "18" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name={p.ikon as IconName} size={20} color={p.renk} />
        <Text style={[d.philName, { color: p.renk }]}>{p.ad()}</Text>
        {on ? <Icon name="check-circle" size={18} color={p.renk} /> : null}
      </View>
      <Text style={d.philSlogan}>{p.slogan()}</Text>
      <Text style={d.plus}>＋ {p.arti()}</Text>
      <Text style={d.minus}>－ {p.eksi()}</Text>
    </Pressable>
  );
}

/** Felsefe seçilmemişse salonun en üstünde; seçildiyse profilde (yılda bir değişir). */
export function PhilosophyPicker({
  s,
  act,
  first,
}: {
  s: GameState;
  act: Act;
  first?: boolean;
}) {
  const r = s.antrenor!;
  const [open, setOpen] = useState(!!first);
  const can = canChangePhilosophy(s);
  return (
    <Card accent={first ? C.gold : undefined}>
      <Text style={d.kicker}>
        {first ? L("SALONUNUN RUHU") : L("HOCA FELSEFESİ")}
      </Text>
      {first ? (
        <Text style={d.text}>
          {L(
            "Nasıl bir hoca olacaksın? Seçimin öğrencilerini, parayı ve basını etkiler. Yılda bir kez değiştirebilirsin.",
          )}
        </Text>
      ) : null}
      {r.felsefe && !open ? <PhilOption f={r.felsefe} on /> : null}
      {open
        ? PHILOSOPHY_KEYS.map((f) => (
            <PhilOption
              key={f}
              f={f}
              on={r.felsefe === f}
              onPress={
                can
                  ? () => {
                      sfx("chime");
                      act((x) => setPhilosophy(x, f));
                      setOpen(false);
                    }
                  : undefined
              }
            />
          ))
        : null}
      {!first ? (
        can ? (
          <Pressable
            onPress={() => setOpen(!open)}
            hitSlop={8}
            style={{ alignSelf: "center", marginTop: 6 }}
          >
            <Text style={d.link}>
              {open
                ? L("Vazgeç")
                : L("Felsefeni değiştir (yılda bir; sadakat −6)")}
            </Text>
          </Pressable>
        ) : (
          <Text style={[d.meta, { textAlign: "center", marginTop: 6 }]}>
            {L("Felsefe gelecek yıl yeniden değiştirilebilir.")}
          </Text>
        )
      ) : null}
    </Card>
  );
}

// ---------- Maç kampı ----------

export function CampPicker({
  s,
  st,
  act,
}: {
  s: GameState;
  st: Student;
  act: Act;
}) {
  const [msg, setMsg] = useState("");
  const b = st.mac;
  if (!b || b.kose) return null;
  if (b.kamp)
    return (
      <View style={d.campDone}>
        <Icon name={CAMPS[b.kamp].ikon as IconName} size={15} color={C.green} />
        <Text style={d.campDoneT}>{L("Kamp: {0}", [CAMPS[b.kamp].ad()])}</Text>
      </View>
    );
  return (
    <View style={d.camp}>
      <Text style={d.kicker}>
        {L("MAÇ KAMPI · {0}", [st.soyad.toLocaleUpperCase(LOC)])}
      </Text>
      {CAMP_KEYS.map((k: CampKey) => {
        const c = CAMPS[k];
        const fee = c.ucret(st.seviye);
        const poor = s.para < fee;
        return (
          <Pressable
            key={k}
            disabled={poor}
            onPress={() => {
              const box = { t: "" };
              act((x) => {
                const me = x.salon?.ogrenciler.find((y) => y.id === st.id);
                if (me) box.t = chooseCamp(x, me, k);
              });
              setMsg(box.t);
            }}
            style={({ pressed }) => [
              d.campRow,
              pressed && { borderColor: C.blue },
              poor && { opacity: 0.4 },
            ]}
          >
            <Icon
              name={c.ikon as IconName}
              size={18}
              color={k === "sert" ? C.red : C.blue}
            />
            <View style={{ flex: 1 }}>
              <Text style={d.campName}>{c.ad()}</Text>
              <Text style={d.meta}>{c.aciklama()}</Text>
            </View>
            <Text style={d.fee}>{fee ? money(fee) : L("Ücretsiz")}</Text>
          </Pressable>
        );
      })}
      {msg ? <Text style={d.msg}>{msg}</Text> : null}
    </View>
  );
}

// ---------- Ezeli rakip ----------

export function RivalCard({ s }: { s: GameState }) {
  const rv = s.antrenor?.rakip;
  if (!rv) return null;
  const lead = rv.g - rv.m;
  return (
    <LinearGradient colors={["#2a0b10", "#0e0a0b"]} style={d.rival}>
      <Icon name="sword-cross" size={24} color={C.red} />
      <View style={{ flex: 1 }}>
        <Text style={[d.kicker, { color: C.red }]}>{L("EZELİ RAKİP")}</Text>
        <Text style={d.rivalName} numberOfLines={1}>
          {rv.ad}
        </Text>
        <Text style={d.meta} numberOfLines={1}>
          {rv.salon} · {COUNTRIES[rv.ulke]?.ad ?? rv.ulke}
        </Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <Text
          style={[
            d.score,
            { color: lead > 0 ? C.green : lead < 0 ? C.red : C.text },
          ]}
        >
          {rv.g}-{rv.m}
        </Text>
        <Text style={d.meta}>{L("seri")}</Text>
      </View>
    </LinearGradient>
  );
}

// ---------- Ekip ----------

export function StaffCard({ s, act }: { s: GameState; act: Act }) {
  const r = s.antrenor!;
  const ekip = r.ekip ?? [];
  const slots = staffSlots(s);
  const [msg, setMsg] = useState("");
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={d.kicker}>
          {L("EKİP · {0}/{1}", [ekip.length, slots])}
        </Text>
        {ekip.length ? (
          <Text style={[d.kicker, { color: C.orange }]}>
            {L("−{0}/hafta", [money(staffWages(s))])}
          </Text>
        ) : null}
      </View>
      <Text style={d.meta}>
        {L(
          "Yardımcı hocalar haftalık maaş alır. Salon büyüdükçe ekipte yer açılır.",
        )}
      </Text>
      {STAFF_KEYS.map((k) => {
        const st = STAFF[k];
        const on = ekip.includes(k);
        const full = !on && ekip.length >= slots;
        return (
          <View key={k} style={d.staff}>
            <View style={[d.staffIcon, on && { borderColor: C.green }]}>
              <Icon
                name={st.ikon as IconName}
                size={19}
                color={on ? C.green : C.faint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={d.campName}>{st.ad()}</Text>
              <Text style={d.meta}>{st.aciklama()}</Text>
              <Text style={d.meta}>
                {on
                  ? L("Maaş {0}/hafta", [money(st.maas)])
                  : L("İmza {0} · maaş {1}/hafta", [
                      money(st.imza),
                      money(st.maas),
                    ])}
              </Text>
            </View>
            {on ? (
              <Pressable
                onPress={() => act((x) => fireStaff(x, k))}
                hitSlop={6}
                style={d.ghostBtn}
              >
                <Text style={d.ghostT}>{L("Gönder")}</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={full}
                onPress={() => {
                  const box = { e: null as string | null };
                  act((x) => {
                    box.e = hireStaff(x, k);
                  });
                  setMsg(box.e ?? "");
                  if (!box.e) sfx("chime");
                }}
                hitSlop={6}
                style={[d.hireBtn, full && { opacity: 0.35 }]}
              >
                <Text style={d.hireT}>{L("İşe al")}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {msg ? <Text style={d.msg}>{msg}</Text> : null}
    </Card>
  );
}

// ---------- Uzmanlık (beceri satırının altında) ----------

export function PerkRow({
  s,
  k,
  act,
}: {
  s: GameState;
  k: CoachSkill;
  act: Act;
}) {
  const r = s.antrenor!;
  const chosen = r.uzman?.[k];
  if (r.beceri[k] < SKILL_MAX) return null;
  if (chosen)
    return (
      <View style={d.perkOn}>
        <Icon name="medal" size={14} color={C.gold} />
        <Text style={d.perkOnT}>
          {PERKS[k][chosen].ad()} ·{" "}
          <Text style={d.meta}>{PERKS[k][chosen].aciklama()}</Text>
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 6, marginTop: 6 }}>
      <Text style={[d.kicker, { color: C.gold }]}>
        {L("UZMANLIK SEÇ (KALICI)")}
      </Text>
      {(["a", "b"] as Perk[]).map((p) => (
        <Pressable
          key={p}
          onPress={() => {
            sfx("chime");
            act((x) => choosePerk(x, k, p, SKILL_MAX));
          }}
          style={({ pressed }) => [d.perk, pressed && { borderColor: C.gold }]}
        >
          <Text style={d.campName}>{PERKS[k][p].ad()}</Text>
          <Text style={d.meta}>{PERKS[k][p].aciklama()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Emeklilik ve Onur Listesi ----------

export function RetireCard({ s, act }: { s: GameState; act: Act }) {
  const [ask, setAsk] = useState(false);
  const r = s.antrenor!;
  if (r.emekli) return null;
  const can = canRetire(s);
  const p = legacyScore(s);
  return (
    <Card>
      <Text style={d.kicker}>{L("MİRAS")}</Text>
      <Text style={d.text}>
        {L("Şu anki miras puanın {0}: “{1}”.", [p, legacyTitle(p)])}
      </Text>
      <Text style={d.meta}>
        {L(
          "Galibiyetler, UCC'ye çıkan ve şampiyon olan öğrenciler, Yılın Antrenörü ödülleri ve salon sıran mirasını büyütür.",
        )}
      </Text>
      {!can ? (
        <Text style={[d.meta, { marginTop: 6 }]}>
          {L(
            "{0}. yıldan sonra (ya da bir şampiyon yetiştirince) emekli olup Onur Listesi'ne yazılabilirsin.",
            [RETIRE_YEAR + 1],
          )}
        </Text>
      ) : ask ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={d.text}>
            {L(
              "Emin misin? Bu salonun hikâyesi biter, adın Antrenör Onur Listesi'ne yazılır.",
            )}
          </Text>
          <Button
            label={L("Düdüğü bırak")}
            icon="whistle"
            tone="gold"
            onPress={() => {
              const box: { l: CoachLegacy | null } = { l: null };
              act((x) => {
                box.l = retireCoach(x);
              });
              if (box.l) {
                addCoachLegacy(box.l);
                sfx("fanfare");
              }
            }}
          />
          <Button
            label={L("Vazgeç")}
            tone="ghost"
            onPress={() => setAsk(false)}
          />
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Button
            label={L("Emekli ol")}
            icon="flag-checkered"
            tone="ghost"
            onPress={() => setAsk(true)}
          />
        </View>
      )}
    </Card>
  );
}

export function RetiredHero({ s }: { s: GameState }) {
  const l = s.antrenor!.emekli!;
  return (
    <LinearGradient colors={["#2e2206", "#0e0c07"]} style={d.retired}>
      <Icon name="trophy-award" size={40} color={C.gold} />
      <Text style={d.kicker}>{L("EMEKLİ HOCA · {0} YIL", [l.yil])}</Text>
      <Text style={[d.retName, SLANT]}>{l.ad.toLocaleUpperCase(LOC)}</Text>
      <Text style={d.retTitle}>“{l.unvan}”</Text>
      <View style={d.retRow}>
        {[
          [String(l.puan), L("Miras")],
          [`${l.g}-${l.m}`, L("Karne")],
          [String(l.ucc), L("UCC'ye çıkan")],
          [String(l.sampiyon), L("Şampiyon")],
          [String(l.odul), L("Yılın Antrenörü")],
        ].map(([v, k]) => (
          <View key={k} style={{ alignItems: "center", flex: 1 }}>
            <Text style={d.retVal}>{v}</Text>
            <Text style={d.metaC}>{k}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

export function CoachHallOfFame({ me }: { me?: number }) {
  const list = useCoachHof();
  return (
    <Card>
      <Text style={d.kicker}>{L("ANTRENÖR ONUR LİSTESİ")}</Text>
      {!list.length ? (
        <Text style={d.meta}>
          {L("Henüz emekli hoca yok. İlk isim senin olabilir.")}
        </Text>
      ) : null}
      {list.slice(0, 10).map((x, i) => (
        <View
          key={x.tarih}
          style={[
            d.hof,
            i > 0 && d.div,
            x.tarih === me && { backgroundColor: "#2a2106" },
          ]}
        >
          <Text style={d.hofN}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={d.campName} numberOfLines={1}>
              {x.ad} · <Text style={{ color: C.gold }}>{x.unvan}</Text>
            </Text>
            <Text style={d.meta} numberOfLines={1}>
              {L("{0} · {1} yıl · {2} şampiyon · {3} ödül", [
                x.salon,
                x.yil,
                x.sampiyon,
                x.odul,
              ])}
            </Text>
          </View>
          <Text style={d.score}>{x.puan}</Text>
        </View>
      ))}
    </Card>
  );
}

const d = StyleSheet.create({
  strip: { flexDirection: "row", gap: 10, marginTop: 12 },
  stripLab: {
    color: C.faint,
    fontFamily: F.display,
    fontSize: 8.5,
    letterSpacing: 1,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ffffff14",
    marginTop: 4,
    overflow: "hidden",
  },
  fill: { height: 5, borderRadius: 3 },
  kicker: {
    color: C.gold,
    fontFamily: F.display,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 4,
  },
  text: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  metaC: {
    color: C.faint,
    fontFamily: F.body,
    fontSize: 10.5,
    textAlign: "center",
  },
  link: {
    color: C.faint,
    fontFamily: F.semi,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  msg: {
    color: C.orange,
    fontFamily: F.semi,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  phil: {
    borderWidth: 1,
    borderRadius: R + 2,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  philName: { flex: 1, fontFamily: F.display, fontSize: 16 },
  philSlogan: {
    color: C.dim,
    fontFamily: F.semi,
    fontSize: 12.5,
    fontStyle: "italic",
  },
  plus: { color: C.green, fontFamily: F.body, fontSize: 12.5, lineHeight: 17 },
  minus: {
    color: "#ff8a93",
    fontFamily: F.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  camp: {
    borderWidth: 1,
    borderColor: "#1f4a63",
    backgroundColor: "#0a141c",
    borderRadius: R + 2,
    padding: 12,
    gap: 6,
    marginBottom: 10,
  },
  campRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R,
    padding: 10,
    backgroundColor: "#0c0d10",
  },
  campName: { color: C.text, fontFamily: F.bold, fontSize: 13.5 },
  fee: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  campDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: -2,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#0f2a1a",
  },
  campDoneT: { color: C.green, fontFamily: F.semi, fontSize: 12 },
  rival: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#5a1820",
    borderRadius: R + 4,
    padding: 12,
    marginBottom: 10,
  },
  rivalName: { color: C.text, fontFamily: F.display, fontSize: 17 },
  score: { color: C.gold, fontFamily: F.display, fontSize: 20 },
  staff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  staffIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hireBtn: {
    backgroundColor: C.blue,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  hireT: { color: "#04121c", fontFamily: F.bold, fontSize: 12 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ghostT: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  perk: {
    borderWidth: 1,
    borderColor: C.goldDeep,
    borderRadius: R,
    padding: 10,
    backgroundColor: "#15110a",
  },
  perkOn: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  perkOnT: { flex: 1, color: C.gold, fontFamily: F.bold, fontSize: 12.5 },
  retired: {
    borderRadius: R + 4,
    borderWidth: 1,
    borderColor: C.goldDeep,
    padding: 18,
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  retName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 26,
    textAlign: "center",
  },
  retTitle: { color: C.gold, fontFamily: F.semi, fontSize: 15 },
  retRow: { flexDirection: "row", alignSelf: "stretch", marginTop: 10 },
  retVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  hof: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  hofN: {
    color: C.faint,
    fontFamily: F.display,
    fontSize: 16,
    width: 22,
    textAlign: "center",
  },
  div: { borderTopWidth: 1, borderTopColor: C.border },
});
