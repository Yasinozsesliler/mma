import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { availableSites, campChoose, campQuote, cutCost, FACEOFF, INTENSITY, PRESS, WEIGHT_CUTS } from '../engine/camp';
import { lookFor } from '../engine/tale';
import { FighterAvatar } from './FighterAvatar';
import { TaleOfTape } from './TaleOfTape';
import { CAMP_SITES } from '../engine/gyms';
import { enterCasino } from '../engine/casino';
import { banned, banWeeksLeft, dopingActive, serveBan } from '../engine/doping';
import { untreated } from '../engine/nightlifeCore';
import { OWNERS } from '../engine/owners';
import {
  acceptOffer,
  continueAfterPost,
  campCostPreview,
  findNextFight,
  interview,
  money,
  negotiateOffer,
  pickOpponent,
  rejectImposed,
  rejectOffer,
  stayAmateur,
  changeWeight,
  weightOptions,
  weightStatDelta,
} from '../engine/career';
import { currentOrg, fullName, statAverage } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { chooseEvent, closeEvent } from '../engine/events';
import { PLANS } from '../engine/fight';
import { describeOpponent, oppRecord } from '../engine/opponents';
import type { CampState, GameState, Intensity, Opponent, PlanKey, PressChoice, StatKey, Stats, WeightCut } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { Button, Card, Choice, Icon, P, Pill, Screen, Section, SLANT, Title, upName, type IconName } from './components';
import { NewsFeed, RankingList, RestPicker } from './HubParts';
import { Compare } from './Compare';
import { ProfilePanel } from './ProfilePanel';
import { SkillPanel } from './SkillPanel';
import { weeklyBusinessIncome } from '../engine/economy';
import { OvrBadge, StatusPanel } from './StatusPanel';
import { C, F, R } from './theme';

export type Act = (fn: (s: GameState) => void) => void;

const STAT_ICONS: Record<StatKey, IconName> = {
  vurus: 'boxing-glove',
  gures: 'arm-flex',
  yer: 'lock',
  kondisyon: 'lungs',
  cene: 'shield-check',
  hiz: 'flash',
  iq: 'brain',
};

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; badge?: number }[] }) {
  return (
    <View style={gs.tabs}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[gs.tab, on && gs.tabOn]}>
            <Text style={[gs.tabText, on && { color: '#fff' }]}>{it.label}</Text>
            {it.badge ? (
              <View style={gs.badge}>
                <Text style={gs.badgeText}>{it.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Hub ----------

export function HubScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<'ana' | 'gelisim' | 'siralama' | 'gecmis'>('ana');
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [resting, setResting] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const org = ORGS[currentOrg(s)];
  const injured = s.sakatliklar.length > 0;
  return (
    <Screen>
      <StatusPanel s={s} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'ana', label: 'KARİYER' },
          { key: 'gelisim', label: 'GELİŞİM', badge: s.puan },
          { key: 'siralama', label: 'SIRALAMA' },
          { key: 'gecmis', label: 'PROFİL' },
        ]}
      />

      {tab === 'ana' ? (
        <>
          <Section>NE YAPACAKSIN?</Section>
          {banned(s) ? (
            <Card accent={C.red}>
              <P style={{ marginBottom: 6 }}>🚫 {s.ceza?.sebep}. Men cezan sürüyor: {banWeeksLeft(s)} hafta kaldı. Bu sürede dövüşemezsin.</P>
              <Button label="Cezanı çek (zamanı ilerlet)" icon="timer-sand" tone="ghost" onPress={() => act((x) => { x.haberler.unshift(serveBan(x)); })} />
            </Card>
          ) : null}
          {untreated(s) ? (
            <Card accent={C.red}>
              <P style={{ marginBottom: 0 }}>⚠️ Tedavi edilmemiş bir enfeksiyonun var ({s.hastalik!.ad}). Sağlığın her hafta düşüyor ve maç öncesi sağlık kontrolünde yakalanabilirsin. Gece hayatı ekranından tedavi ol.</P>
            </Card>
          ) : null}
          {(s.hayvanlar ?? []).some((p) => p.hasta || p.mutluluk < 30) ? (
            <Card accent={C.orange}>
              <P style={{ marginBottom: 0 }}>🐾 {(s.hayvanlar ?? []).filter((p) => p.hasta || p.mutluluk < 30).map((p) => p.ad).join(', ')} ilgi bekliyor. Mağaza → Hayvan sekmesinden bak.</P>
            </Card>
          ) : null}
          {dopingActive(s) ? (
            <Card accent={C.orange}>
              <P style={{ marginBottom: 0 }}>💉 Doping kürün etkide: {s.doping!.kalan} dövüş kaldı. Her dövüşten sonra test riski var.</P>
            </Card>
          ) : null}
          <Choice
            disabled={banned(s)}
            icon="sword-cross"
            label="Sıradaki dövüşü ayarla"
            desc={
              (org.rakipSecimi ? 'Rakibini kendin seç.' : `${org.kisa} sana rakip önerecek.`) +
              (injured ? '\n⚠️ Aktif sakatlığın var, kafeste zayıf olursun.' : '') +
              (s.stage !== 'amator' ? `\nTahmini kamp masrafı: ${money(campCostPreview(s))}` : '')
            }
            onPress={() => act(findNextFight)}
          />
          <Choice
            icon="bed"
            label="Dinlen ve iyileş"
            desc={`Süreyi sen seç. Şu an sağlık ${s.saglik}/100${s.sakatliklar.length ? `, ${s.sakatliklar.length} sakatlık` : ''}.`}
            onPress={() => setResting(!resting)}
            selected={resting}
            tone="plain"
          />
          {resting ? <RestPicker s={s} act={act} onDone={() => setResting(false)} /> : null}
          <Choice icon="shopping" label="Mağaza, yatırım ve tatil" desc={`Ekipman, yaşam, işletmeler, yatırımlar ve tatiller.${weeklyBusinessIncome(s) ? ` İşletme geliri: $${weeklyBusinessIncome(s).toLocaleString('tr-TR')}/hafta` : ''}`} onPress={() => act((x) => (x.phase = 'magaza'))} tone="gold" />
          <Choice icon="whistle" label="Takım ve sponsorlar" desc={`Salon, menajer ve sponsorluklar.${(s.sponsorTeklif ?? []).length ? ` 💼 ${(s.sponsorTeklif ?? []).length} yeni sponsor teklifi!` : ''} Aktif sponsor: ${(s.sponsorlar ?? []).length}`} onPress={() => act((x) => (x.phase = 'takim'))} tone="plain" />
          <Choice icon="medal" label="Başarımlar ve Hall of Fame" desc={`${(s.basarimlar ?? []).length}/100 başarım açıldı.${s.hof ? ' 🏛 Onur Listesi üyesisin!' : ' Onur Listesi eşiklerini takip et.'}`} onPress={() => act((x) => (x.phase = 'basarimlar'))} tone={s.hof ? 'gold' : 'plain'} />
          <Choice icon="cellphone-message" label="Sosyal medya" desc={`${(s.sosyal ?? []).length} paylaşım · Rakiplerin ne diyor, maçların hikâyesi ne?`} onPress={() => act((x) => (x.phase = 'sosyal'))} tone="plain" />
          <Choice icon="glass-cocktail" label="Gece hayatı" desc={`Randevular, striptiz kulübü, kumarhane.${s.iliski ? ` 💞 Sevgilin: ${s.iliski.ad}` : ''}`} onPress={() => act((x) => (x.phase = 'gece'))} tone="plain" />
          {s.stage !== 'amator' ? (
            <Choice
              icon="scale-balance"
              label="Sıklet değiştir"
              desc={s.sampiyon ? '🏆 Şampiyonsun: yeni sıklette doğrudan ünvan maçı alırsın. Çift sıklet şampiyonluğu seni bekliyor!' : `Şu an ${WEIGHT_CLASSES[s.fighter.siklet].ad}. Değiştirirsen sıralamasız başlarsın.`}
              onPress={() => setWeightOpen(!weightOpen)}
              selected={weightOpen}
              tone={s.sampiyon ? 'gold' : 'plain'}
            />
          ) : null}
          {weightOpen ? (
            <Card accent={C.gold}>
              {weightOptions(s).map((w) => {
                const delta = weightStatDelta(s.fighter.siklet, w.siklet);
                const txt = Object.entries(delta)
                  .map(([k, v]) => `${(v ?? 0) > 0 ? '+' : ''}${v} ${STAT_LABELS[k as StatKey]}`)
                  .join(' · ');
                return (
                  <Choice
                    key={w.siklet}
                    icon={w.yon === 'yukari' ? 'arrow-up-bold' : 'arrow-down-bold'}
                    label={`${WEIGHT_CLASSES[w.siklet].ad} sıklete ${w.yon === 'yukari' ? 'çık' : 'in'} (${WEIGHT_CLASSES[w.siklet].kg} kg)`}
                    desc={`${txt || 'İstatistik değişmez'} · 4 hafta adaptasyon`}
                    tone="gold"
                    onPress={() => {
                      act((x) => {
                        changeWeight(x, w.siklet);
                      });
                      setWeightOpen(false);
                    }}
                  />
                );
              })}
            </Card>
          ) : null}
          {confirmRetire ? (
            <Card accent={C.red}>
              <P>Emin misin? Kariyerin burada sona erecek.</P>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Vazgeç" tone="ghost" onPress={() => setConfirmRetire(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Emekli ol" onPress={() => act((x) => (x.phase = 'emeklilik'))} />
                </View>
              </View>
            </Card>
          ) : (
            <Choice icon="flag-checkered" label="Emekli ol" desc="Eldivenleri as. Kariyer burada biter." tone="plain" onPress={() => setConfirmRetire(true)} />
          )}
          <Section>DÖVÜŞ HABERLERİ</Section>
          <NewsFeed items={s.haberler.slice(0, 7)} />
        </>
      ) : tab === 'gelisim' ? (
        <SkillPanel s={s} act={act} />
      ) : tab === 'siralama' ? (
        <RankingList s={s} />
      ) : (
        <>
          <ProfilePanel s={s} act={act} />
          <History s={s} />
        </>
      )}
    </Screen>
  );
}

function ResultBadge({ r }: { r: 'G' | 'M' | 'B' }) {
  const col = r === 'G' ? C.green : r === 'M' ? C.red : C.gold;
  return (
    <View style={[gs.resBadge, { backgroundColor: col + '22', borderColor: col }]}>
      <Text style={[gs.resBadgeText, { color: col }]}>{r}</Text>
    </View>
  );
}

function History({ s }: { s: GameState }) {
  return (
    <>
      <Section>HİKÂYE</Section>
      <Card>
        <P dim style={{ fontStyle: 'italic', marginBottom: 0 }}>
          {s.fighter.hikaye || '—'}
        </P>
      </Card>
      <Section>DÖVÜŞ GEÇMİŞİ</Section>
      {s.gecmis.length === 0 ? <P dim>Henüz dövüş yok.</P> : null}
      <Card style={{ paddingVertical: 6 }}>
        {s.gecmis.map((h, i) => (
          <View key={i} style={[gs.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
            <ResultBadge r={h.sonuc} />
            <View style={{ flex: 1 }}>
              <Text style={gs.histName}>{h.rakip}</Text>
              <Text style={gs.meta}>
                {h.yontem} · R{h.raunt} · {ORGS[h.org].kisa} · {h.yas} yaş
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

// ---------- Olay ----------

const EVENT_ICONS: Record<string, IconName> = {
  sponsor: 'handshake',
  viral: 'cellphone-message',
  salon: 'office-building',
  menajer: 'account-tie',
  aile: 'home-heart',
  parti: 'party-popper',
  araba: 'car-sports',
  sparring: 'boxing-glove',
  hayir: 'heart-pulse',
  gazeteci: 'microphone-variant',
  cagri: 'sword-cross',
  dolandirici: 'cash-multiple',
};

export function EventScreen({ s, act }: { s: GameState; act: Act }) {
  const ev = s.pending.olay!;
  return (
    <Screen footer={ev.sonuc ? <Button label="Devam" icon="arrow-right" onPress={() => act(closeEvent)} /> : undefined}>
      {ev.id.startsWith('patron_') && OWNERS[s.contract?.org ?? 'ufc'] ? (
        <View style={{ marginBottom: 10 }}>
          <FighterAvatar look={lookFor({ id: `owner-${OWNERS[s.contract?.org ?? 'ufc']!.ad}`, uyruk: OWNERS[s.contract?.org ?? 'ufc']!.uyruk })} size={80} ring={C.gold} />
        </View>
      ) : (
        <View style={gs.eventIcon}>
          <Icon name={EVENT_ICONS[ev.id] ?? 'star-four-points'} size={34} color={C.gold} />
        </View>
      )}
      <Title kicker="DÖVÜŞ DIŞI">{ev.baslik.replace(/^\S+\s/, '')}</Title>
      <Card>
        <P style={{ marginBottom: 0 }}>{ev.metin}</P>
      </Card>
      {ev.sonuc ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{ev.sonuc}</P>
        </Card>
      ) : (
        ev.secenekler.map((o, i) => <Choice key={i} n={i + 1} label={o} onPress={() => act((x) => chooseEvent(x, i))} />)
      )}
    </Screen>
  );
}

// ---------- Rakip seçimi ----------

function OpponentCard({ o, me }: { o: Opponent; me: Stats }) {
  const d = describeOpponent(o);
  const tone = o.zorluk === 1 ? C.red : o.zorluk === -1 ? C.green : C.gold;
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        {o.etiket ? <Pill text={o.etiket.replace(/^\S+\s/, '')} color={tone} /> : <View />}
        <Pill text={o.champion ? 'ŞAMPİYON' : o.rank ? `#${o.rank}` : 'Sıralamasız'} icon={o.champion ? 'crown' : 'podium'} color={o.champion ? C.gold : C.dim} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <OvrBadge value={d.guc} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={gs.nick}>“{o.lakap}”</Text>
          <Text style={gs.oppName}>{upName(`${o.ad} ${o.soyad}`, o.uyruk)}</Text>
          <Text style={gs.meta}>
            {o.uyruk} · {oppRecord(o)} · {d.stil} · {o.kisilik}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        <Pill text={`Güçlü: ${d.guclu}`} icon="arrow-up-bold-circle" color={C.green} />
        <Pill text={`Zayıf: ${d.zayif}`} icon="alert-octagon" color={C.red} />
      </View>
      <Compare me={me} opp={o.stats} />
      {o.riskMetni ? <Text style={gs.risk}>{o.riskMetni}</Text> : null}
    </>
  );
}

export function OpponentScreen({ s, act }: { s: GameState; act: Act }) {
  const list = s.pending.secenekler!;
  const me = s.fighter.stats;
  const myOvr = Math.round(statAverage(me));
  if (s.pending.dayatma) {
    const o = list[0];
    return (
      <Screen
        footer={
          <>
            <Button label="Kabul et" icon="handshake" onPress={() => act((x) => pickOpponent(x, 0))} />
            <Button label="Reddet (popülerlik -3)" tone="ghost" onPress={() => act(rejectImposed)} />
          </>
        }
      >
        <Title kicker={ORGS[currentOrg(s)].ad.toUpperCase()} sub={`Matchmaker telefonda. Senin gücün: ${myOvr}.`}>
          Dövüş Teklifi
        </Title>
        <Card accent={C.red}>
          <OpponentCard o={o} me={me} />
        </Card>
        {s.reddedilen > 0 ? <P style={{ color: C.orange }}>⚠️ Bu {s.reddedilen + 1}. reddedişin olur. Üçüncüde kontratın feshedilir.</P> : null}
      </Screen>
    );
  }
  return (
    <Screen footer={<Button label="Geri" tone="ghost" onPress={() => act((x) => { x.pending = {}; x.phase = 'hub'; })} />}>
      <Title kicker="SIRADAKİ DÖVÜŞ" sub={`Senin gücün: ${myOvr}. Kiminle dövüşeceksin?`}>
        Rakip Seçimi
      </Title>
      {list.map((o, i) => (
        <Card key={o.id} accent={o.zorluk === 1 ? C.red : o.zorluk === -1 ? C.green : C.gold}>
          <OpponentCard o={o} me={me} />
          <View style={{ marginTop: 12 }}>
            <Button label="Bu rakibi seç" icon="sword-cross" tone={i === 1 ? 'red' : 'ghost'} onPress={() => act((x) => pickOpponent(x, i))} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

// ---------- Kamp ----------

const CAMP_STEPS: { key: CampState['step'][]; label: string }[] = [
  { key: ['yer'], label: 'Yer' },
  { key: ['focus'], label: 'Odak' },
  { key: ['plan'], label: 'Plan' },
  { key: ['intensity'], label: 'Yoğunluk' },
  { key: ['kilo'], label: 'Kilo' },
  { key: ['basin'], label: 'Basın' },
  { key: ['sakatlik', 'ozet', 'tarti', 'yuzyuze'], label: 'Tartı' },
];

const PLAN_ICONS: Record<PlanKey, IconName> = { ayakta: 'boxing-glove', gures: 'arm-flex', yer: 'lock', tempo: 'lungs', kontra: 'shield-sword' };
const INT_ICONS: Record<Intensity, IconName> = { dusuk: 'meditation', orta: 'dumbbell', yuksek: 'weight-lifter' };
const CUT_ICONS: Record<WeightCut, IconName> = { kademeli: 'food-apple', normal: 'scale-bathroom', sert: 'alert-octagon' };
const PRESS_ICONS: Record<PressChoice, IconName> = { saygili: 'handshake', trash: 'microphone-variant', sessiz: 'account-voice' };

function CampHeader({ s, k }: { s: GameState; k: CampState }) {
  const o = s.pending.rakip!;
  const d = describeOpponent(o);
  const cur = CAMP_STEPS.findIndex((x) => x.key.includes(k.step));
  return (
    <>
      <View style={gs.steps}>
        {CAMP_STEPS.map((st, i) => (
          <View key={st.label} style={{ flex: 1, alignItems: 'center' }}>
            <View style={[gs.stepBar, { backgroundColor: i < cur ? C.red : i === cur ? C.gold : C.border }]} />
            <Text style={[gs.stepText, i === cur && { color: C.gold }]}>{st.label}</Text>
          </View>
        ))}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <OvrBadge value={d.guc} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={gs.kicker}>
              KAMP · {k.hafta} HAFTA{k.kisaHaber ? ' · KISA HABER' : ''}
            </Text>
            <Text style={[gs.oppName, { fontSize: 18 }]}>VS {upName(`${o.ad} ${o.soyad}`, o.uyruk)}</Text>
            <Text style={gs.meta}>
              {d.stil} · Zayıf: <Text style={{ color: C.red }}>{d.zayif}</Text>
            </Text>
          </View>
        </View>
      </Card>
    </>
  );
}

export function CampScreen({ s, act }: { s: GameState; act: Act }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const choose = (v: string | number) => act((x) => campChoose(x, v));
  const header = <CampHeader s={s} k={k} />;

  if (k.step === 'yer') {
    const open = availableSites(s);
    return (
      <Screen>
        {header}
        <Title sub={`${k.hafta} haftalık kamp. Masraflar kamp bitince ödenir. Bakiye: ${money(s.para)}`}>Kamp Yeri</Title>
        {CAMP_SITES.map((site) => {
          const q = campQuote(s, site.id, k.hafta);
          const locked = !open.includes(site);
          const afford = q.toplam === 0 || s.para >= q.toplam;
          const pills = [
            site.bonusStat ? `🔥 ${STAT_LABELS[site.bonusStat]} odağına +%30` : site.salonUcreti && s.takim.uzmanlik ? `🔥 ${STAT_LABELS[s.takim.uzmanlik]} odağına +%35` : null,
            `Gelişim ×${site.carpan}`,
            site.risk !== 1 ? `Sakatlık riski ×${site.risk}` : null,
            site.puan ? `+${site.puan} gelişim puanı` : null,
          ].filter(Boolean);
          return (
            <Choice
              key={site.id}
              icon={site.ikon as IconName}
              label={`${site.ad} · ${q.toplam ? money(q.toplam) : 'Ücretsiz'}`}
              desc={
                locked
                  ? `🔒 ${site.minStage === 'buyuk' ? 'Büyük organizasyona' : 'Profesyonel kariyere'} geçince açılır.`
                  : `${site.aciklama}\n${pills.join(' · ')}${q.salon ? `\nSalon: ${money(q.salon)}` : ''}${q.yer ? `${q.salon ? ' + ' : '\n'}Kamp yeri: ${money(q.yer)}` : ''}${!afford ? '\n❌ Bakiye yetersiz' : ''}`
              }
              disabled={locked || !afford}
              tone={site.id === 'salon' ? 'red' : 'gold'}
              onPress={() => choose(site.id)}
            />
          );
        })}
      </Screen>
    );
  }
  if (k.step === 'focus')
    return (
      <Screen>
        {header}
        <Title sub="Bu kampta hangi alana yükleneceksin?">Odak Alanı</Title>
        {STAT_KEYS.map((st: StatKey) => (
          <Choice key={st} icon={STAT_ICONS[st]} label={STAT_LABELS[st]} desc={`Şu an: ${s.fighter.stats[st]}`} onPress={() => choose(st)} />
        ))}
      </Screen>
    );
  if (k.step === 'plan')
    return (
      <Screen>
        {header}
        <Title sub={`${s.takim.antrenor}: “Bu adamı nasıl yeneceğiz?”`}>Oyun Planı</Title>
        {(Object.keys(PLANS) as PlanKey[]).map((p) => (
          <Choice key={p} icon={PLAN_ICONS[p]} label={PLANS[p].ad} desc={PLANS[p].aciklama} onPress={() => choose(p)} />
        ))}
      </Screen>
    );
  if (k.step === 'intensity')
    return (
      <Screen>
        {header}
        <Title sub={`Sağlık: ${s.saglik}/100`}>Antrenman Yoğunluğu</Title>
        {(Object.keys(INTENSITY) as Intensity[]).map((p) => (
          <Choice key={p} icon={INT_ICONS[p]} label={INTENSITY[p].ad} desc={INTENSITY[p].aciklama} onPress={() => choose(p)} />
        ))}
      </Screen>
    );
  if (k.step === 'kilo')
    return (
      <Screen>
        {header}
        <Title sub={ORGS[currentOrg(s)].hidrasyon ? '⚠️ ONE’da hidrasyon testi var: sert kilo verme maçı iptal ettirebilir.' : 'Tartı dövüşten bir gün önce.'}>
          Kilo Verme
        </Title>
        {(Object.keys(WEIGHT_CUTS) as WeightCut[]).map((p) => (
          <Choice
            key={p}
            icon={CUT_ICONS[p]}
            label={WEIGHT_CUTS[p].ad + (p === 'kademeli' ? ` · ${cutCost(s) ? money(cutCost(s)) : 'Diyetisyenin var'}` : '')}
            desc={WEIGHT_CUTS[p].aciklama}
            disabled={p === 'kademeli' && !!k.kisaHaber}
            onPress={() => choose(p)}
          />
        ))}
      </Screen>
    );
  if (k.step === 'basin')
    return (
      <Screen>
        {header}
        <Title sub={`${o.soyad} (${o.kisilik}) mikrofonu aldı ve sana döndü. Salon sessiz.`}>Basın Toplantısı</Title>
        {(Object.keys(PRESS) as PressChoice[]).map((p) => (
          <Choice key={p} icon={PRESS_ICONS[p]} label={PRESS[p].ad} desc={PRESS[p].aciklama} onPress={() => choose(p)} />
        ))}
      </Screen>
    );
  if (k.step === 'sakatlik')
    return (
      <Screen>
        {header}
        <Title kicker="KAMPTA KÖTÜ HABER">Sakatlık!</Title>
        <Card accent={C.orange}>
          <P style={{ marginBottom: 0 }}>
            {k.sakatlik!.ad}. Doktor {k.sakatlik!.hafta} haftalık iyileşme öngörüyor. Dövüşürsen {STAT_LABELS[k.sakatlik!.stat]} -{k.sakatlik!.ceza} ile çıkarsın.
          </P>
        </Card>
        <Choice icon="boxing-glove" label="Yine de dövüş" desc="Ücret ve sıralama fırsatı kaçmasın." onPress={() => choose(0)} />
        <Choice icon="medical-bag" label="Maçtan çekil" desc="Ücret yok, popülerlik -3. Ama sağlığın önemli." tone="plain" onPress={() => choose(1)} />
      </Screen>
    );
  if (k.step === 'ozet')
    return (
      <Screen footer={<Button label="Tartıya çık" icon="scale-bathroom" onPress={() => choose(0)} />}>
        {header}
        <Title kicker="KAMP TAMAMLANDI">Kamp Özeti</Title>
        <Card accent={C.green}>
          {k.ozet.map((l, i) => (
            <P key={i}>{l}</P>
          ))}
        </Card>
        <SkillPanel s={s} act={act} title="DÖVÜŞTEN ÖNCE GÜÇLEN" />
      </Screen>
    );
  if (k.step === 'yuzyuze')
    return (
      <Screen footer={k.yuzyuze ? <Button label="Dövüş gecesi" icon="bell-ring" tone="gold" onPress={() => choose(0)} /> : undefined}>
        <Title kicker="TARTI SAHNESİ" sub="Kameralar flaş patlatıyor. Güvenlik görevlileri hazırda bekliyor.">
          Face to Face
        </Title>
        <LinearGradient colors={['#1a0508', '#060607']} style={gs.faceoff}>
          <FighterAvatar look={s.fighter.gorunum} size={130} ring={C.red} />
          <Text style={[gs.faceVs, SLANT]}>⚡</Text>
          <FighterAvatar look={lookFor(o)} size={130} ring={C.blue} />
        </LinearGradient>
        <Text style={[gs.faceNames, SLANT]}>
          {upName(s.fighter.soyad, s.fighter.uyruk)} <Text style={{ color: C.gold }}>vs</Text> {upName(o.soyad, o.uyruk)}
        </Text>
        {k.yuzyuze ? (
          <Card accent={C.gold}>
            <P style={{ marginBottom: 0 }}>{k.yuzyuze}</P>
          </Card>
        ) : (
          FACEOFF.map((f, i) => <Choice key={f.key} n={i + 1} label={f.ad} desc={f.aciklama} tone="gold" onPress={() => choose(f.key)} />)
        )}
      </Screen>
    );
  // tarti
  return (
    <Screen footer={<Button label={k.iptal ? 'Geri dön' : 'Yüz yüze gel'} icon={k.iptal ? 'arrow-left' : 'account-multiple'} tone={k.iptal ? 'ghost' : 'gold'} onPress={() => choose(0)} />}>
      {header}
      <TaleOfTape s={s} />
      <Card accent={k.iptal || k.ucretCeza ? C.red : C.gold}>
        {k.tartiMetni!
          .split('\n')
          .filter((l) => !l.startsWith('⚖️'))
          .map((l, i) => (
            <P key={i}>{l}</P>
          ))}
      </Card>
    </Screen>
  );
}

// ---------- Dövüş sonrası ----------

export function PostFightScreen({ s, act }: { s: GameState; act: Act }) {
  const ps = s.pending.sonrasi!;
  const colors = ps.kazandi ? (['#1f6b3f', '#0f2a1b'] as const) : ps.berabere ? (['#7a5a14', '#2a200b'] as const) : (['#7a1420', '#2a0b10'] as const);
  return (
    <Screen footer={ps.roportajSonucu ? <Button label={s.kutlama ? 'Kutlamaya geç' : 'Devam'} icon={s.kutlama ? 'trophy' : 'arrow-right'} tone={s.kutlama ? 'gold' : 'red'} onPress={() => act(continueAfterPost)} /> : undefined}>
      <LinearGradient colors={colors} style={gs.banner}>
        <Icon name={ps.kazandi ? 'trophy' : ps.berabere ? 'scale-balance' : 'heart-broken'} size={36} color="#fff" />
        <Text style={gs.bannerTitle}>{ps.kazandi ? 'ELİN HAVAYA KALKTI' : ps.berabere ? 'KİMSE KAZANMADI' : 'BU GECE SENİN DEĞİLDİ'}</Text>
        <Text style={gs.bannerSub}>{ps.satirlar[0]}</Text>
      </LinearGradient>
      <Card>
        {ps.satirlar.slice(1).map((l, i) => (
          <Text key={i} style={[gs.line, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
            {l}
          </Text>
        ))}
      </Card>
      <Section>KAFES İÇİ RÖPORTAJ</Section>
      {ps.roportajSonucu ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{ps.roportajSonucu}</P>
        </Card>
      ) : (
        ps.roportajSecenekleri.map((o, i) => <Choice key={i} icon="microphone-variant" label={`“${o}”`} onPress={() => act((x) => interview(x, i))} />)
      )}
      {ps.roportajSonucu && s.puan > 0 ? <SkillPanel s={s} act={act} /> : null}
    </Screen>
  );
}

// ---------- Teklifler ----------

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <View style={gs.offerStat}>
      <Text style={gs.offerStatLabel}>{label}</Text>
      <Text style={[gs.offerStatVal, gold && { color: C.gold }]}>{value}</Text>
    </View>
  );
}

export function OffersScreen({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  const offers = s.pending.teklifler!;
  const amateur = currentOrg(s) === 'amator';
  return (
    <Screen footer={amateur ? <Button label="Şimdilik amatörde kal" tone="ghost" onPress={() => act(stayAmateur)} /> : undefined}>
      <Title kicker="MENAJERİN TELEFONU SUSMUYOR" sub={s.pending.teklifMetni}>
        Kontrat Teklifleri
      </Title>
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}
      {offers.map((o) => {
        const ufc = o.org === 'ufc' || o.org === 'dwcs';
        return (
          <LinearGradient key={o.id} colors={ufc ? ['#2e2006', '#0c0d10'] : ['#1f070b', '#0c0d10']} style={[gs.offer, { borderColor: ufc ? C.goldDeep : '#3a1a20' }]}>
            <Text style={gs.offerOrg}>{ORGS[o.org].ad}</Text>
            <Text style={gs.meta}>{o.not}</Text>
            <View style={gs.offerStats}>
              <Stat label="Dövüş" value={`${o.dovus}`} />
              <Stat label="Ücret" value={money(o.ucret)} gold />
              <Stat label="Galibiyet" value={`+${money(o.bonus)}`} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill text={o.munhasir ? 'Münhasır' : 'Münhasır değil'} icon="lock" color={o.munhasir ? C.orange : C.green} />
              {o.ozel ? <Pill text={o.ozel} icon="file-sign" color={o.fesih ? C.red : C.gold} /> : null}
            </View>
            <View style={{ gap: 8, marginTop: 14 }}>
              <Button label={o.devam ? 'Kontrata devam et' : o.fesih ? `Kabul et (-${money(o.fesih)})` : 'Kabul et'} icon="file-sign" tone={ufc || o.org === 'dwcs' ? 'gold' : 'red'} disabled={!!o.fesih && s.para < o.fesih} onPress={() => act((x) => acceptOffer(x, o.id))} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!o.pazarlikYapildi ? (
                  <View style={{ flex: 1 }}>
                    <Button label="Pazarlık" icon="handshake" tone="ghost" onPress={() => act((x) => setMsg(negotiateOffer(x, o.id)))} />
                  </View>
                ) : null}
                {offers.length > 1 && !o.devam && !o.fesih ? (
                  <View style={{ flex: 1 }}>
                    <Button label="Reddet" tone="ghost" onPress={() => act((x) => rejectOffer(x, o.id))} />
                  </View>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        );
      })}
    </Screen>
  );
}

// ---------- Emeklilik ----------

export function RetireScreen({ s, onNew }: { s: GameState; onNew: () => void }) {
  const r = s.rekor;
  const ufcChamp = s.unvanlar.some((u) => u.startsWith('UFC'));
  return (
    <Screen footer={<Button label="Yeni kariyer" icon="restart" onPress={onNew} />}>
      <LinearGradient colors={['#3a2a0a', '#0a0b0e']} style={gs.banner}>
        <Icon name={ufcChamp ? 'crown' : 'flag-checkered'} size={40} color={C.gold} />
        <Text style={gs.bannerTitle}>{ufcChamp ? 'BİR EFSANE VEDA EDİYOR' : 'SON ZİL'}</Text>
        <Text style={gs.bannerSub}>
          {fullName(s.fighter)} · {s.fighter.yas} yaşında eldivenlerini astı
        </Text>
      </LinearGradient>
      <StatusPanel s={s} />
      <Card>
        <P>
          Profesyonel rekor: {r.g}-{r.m}-{r.b} (KO/TKO {r.ko}, SUB {r.sub}, Karar {r.karar})
        </P>
        <P style={{ marginBottom: 0 }}>Amatör rekor: {s.amator.g}-{s.amator.m}-{s.amator.b}</P>
      </Card>
      <Section>ÜNVANLAR</Section>
      {s.unvanlar.length ? s.unvanlar.map((u, i) => <P key={i}>🏆 {u}</P>) : <P dim>Kemer yok. Ama yol yürünmüştü.</P>}
    </Screen>
  );
}

const gs = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 4, marginBottom: 4 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: R - 4 },
  tabOn: { backgroundColor: C.red, transform: [{ skewX: '-8deg' }] },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
  badge: { backgroundColor: C.gold, borderRadius: 999, minWidth: 20, paddingHorizontal: 5, height: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#1f1605', fontFamily: F.black, fontSize: 11 },
  news: { flexDirection: 'row', gap: 10, paddingVertical: 9 },
  newsText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  resBadge: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resBadgeText: { fontFamily: F.display, fontSize: 15 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  histName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  oppName: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 27 },
  kicker: { color: C.red, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  risk: { color: C.dim, fontFamily: F.body, fontSize: 13, marginTop: 10, fontStyle: 'italic', lineHeight: 19 },
  cmpHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cmpHeadText: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  cmpVal: { width: 24, color: C.faint, fontFamily: F.display, fontSize: 14 },
  cmpTrack: { flex: 1, height: 6, backgroundColor: '#0b0c10', borderRadius: 3, overflow: 'hidden' },
  cmpLabel: { width: 70, textAlign: 'center', color: C.dim, fontFamily: F.semi, fontSize: 11 },
  eventIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '55', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  steps: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  stepBar: { height: 4, borderRadius: 2, alignSelf: 'stretch' },
  stepText: { color: C.faint, fontFamily: F.semi, fontSize: 10, marginTop: 4 },
  faceoff: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: R, padding: 16, borderWidth: 1, borderColor: '#3a1a20', marginBottom: 8 },
  faceVs: { color: C.gold, fontFamily: F.display, fontSize: 34 },
  faceNames: { color: C.text, fontFamily: F.display, fontSize: 22, textAlign: 'center', marginBottom: 12 },
  banner: { borderRadius: R, padding: 20, alignItems: 'center', marginBottom: 12, gap: 4 },
  bannerTitle: { color: '#fff', fontFamily: F.display, fontSize: 28, letterSpacing: 1, textAlign: 'center' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  line: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, paddingVertical: 7 },
  offer: { borderRadius: R + 2, borderWidth: 1, padding: 16, marginBottom: 14 },
  offerOrg: { color: C.text, fontFamily: F.display, fontSize: 26, textTransform: 'uppercase' },
  offerStats: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  offerStat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
  offerStatLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  offerStatVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
});
