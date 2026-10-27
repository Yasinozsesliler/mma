import { L, LOC } from '../i18n';
import { AdOffer } from './AdOffer';
import { ScoutReportCard } from './ScoutReportCard';
import { StoryChapter } from './StoryChapter';
import { houseLevel } from './HomeScreen';
import { MUSEUM } from '../engine/memories';
import { luxTotal } from '../engine/luxury';
import { MEDIA_ICON, type MediaKind } from '../engine/media';
import { ageStage } from '../engine/body';
import { unclaimedSets } from '../engine/cards';
import { claimScout } from '../engine/rewards';
import { RewardCard } from './RewardCard';
import { CoachTip, type TipId } from './CoachTip';
import { careerCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { availableSites, campChoose, campQuote, coachCampPlan, cutCost, FACEOFF, INTENSITY, PRESS, WALKOUT_STYLES, WEIGHT_CUTS } from '../engine/camp';
import { PLANS } from '../engine/fight';
import { lookFor } from '../engine/tale';
import { FighterAvatar } from './FighterAvatar';
import { TaleOfTape } from './TaleOfTape';
import { CAMP_SITES } from '../engine/gyms';
import { banned, banWeeksLeft, dopingActive, serveBan } from '../engine/doping';
import { untreated } from '../engine/nightlifeCore';
import { OWNERS } from '../engine/owners';
import {
  acceptOffer,
  campCostPreview,
  findNextFight,
  money,
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
import { describeOpponent, oppRecord } from '../engine/opponents';
import type { CampState, GameState, Intensity, Opponent, PressChoice, StatKey, Stats, WeightCut } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { Button, Card, Choice, Icon, P, Pill, Screen, Section, Title, upName, type IconName } from './components';
import { NewsFeed, RestPicker } from './HubParts';
import { cityPin, visitedCount, visitedKitalar } from '../engine/worldMap';
import { ActionGrid, ActionTile, FightCTA, HubHero, Notice } from './HubHome';
import { pendingBouts, weeklyGymNet } from '../engine/academy';
import { ACHIEVEMENTS } from '../engine/achievements';
import { UccRoadCard } from './UccRoadCard';
import { GoalsCard } from './GoalsCard';
import { CountdownButton, HypeMeter } from './CountdownDoc';
import { watchCountdown } from '../engine/hype';
import { canStream, startStream, STREAM_MIN_FOLLOWERS } from '../engine/stream';
import { fmtFollowers, followers } from '../engine/fame';
import { appeal, appealChance, appealFee, appealFeeText, dismissAppeal } from '../engine/appeal';
import { acceptCrossover, declineCrossover } from '../engine/crossover';
import { LegendPanel } from './LegendPanel';
import { PerkTree } from './PerkTree';
import { FatigueCard } from './FatigueCard';
import { perkPointsFree } from '../engine/perks';
import { SpecialEventCard } from './SpecialEventCard';
import { chooseTreatment, treatmentCostText, treatmentOptions } from '../engine/treatment';
import { ContractTablePanel } from './ContractTablePanel';
import { openTable } from '../engine/contractTable';
import { FanMeetGame } from './FanMeetGame';
import { canFanMeet, fanMeet } from '../engine/fanMeet';
import { GrandPrixCard } from './GrandPrixCard';
import { KafesEviInvite } from './KafesEviScreen';
import { BrainCard } from './BrainCard';
import { PosterCard } from './PosterCard';
import { FirstStepsCard } from './FirstStepsCard';
import { HubCategories, type HubCat } from './HubCategories';
import { featureOpen, isNewFeature, seeFeature } from '../engine/onboarding';
import { dmUnread } from '../engine/dm';
import { canActivity, canFoundClub, members } from '../engine/fanClub';
import { brainEpilogue } from '../engine/brain';
import { comebackOffer } from '../engine/comeback';
import { declinePodcast } from '../engine/podcast';
import { unclaimedMilestones } from '../engine/cards';
import { crisisTitle } from '../engine/crisis';
import { EventCard } from './EventCard';
import { TrashTalkDuel } from './TrashTalkDuel';
import { PressConference } from './PressConference';
import { WeightCutStep } from './WeightCutStep';
import { WikiButton } from './WikiPage';
import { CampLengthStep, CampSummary } from './CampCalendar';
import { CampRun } from './CampRun';
import { CampPlanner } from './CampPlanner';
import { TechniquePanel } from './TechniquePanel';
import { FaceOffStage } from './FaceOffStage';
import { RankingsTab } from './P4PPanel';
import { PlanPicker } from './PlanPicker';
import { coachIntro } from '../engine/coach';
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
            {/* Uzun çeviriler (DEVELOPMENT, РАЗВИТИЕ) tek satıra sığsın: küçülür, komşu sekmeye taşmaz */}
            <Text style={[gs.tabText, it.label.length > 8 && { fontSize: 10.5, letterSpacing: 0.2 }, on && { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {it.label}
            </Text>
            {it.badge ? (
              <View style={gs.tabBadge} pointerEvents="none">
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
  const [newsAll, setNewsAll] = useState(false);
  const [fanMeetOpen, setFanMeet] = useState(false);
  const [hubCat, setHubCat] = useState<HubCat>('antrenman');
  const org = ORGS[currentOrg(s)];
  const injured = s.sakatliklar.length > 0;
  return (
    <Screen>
      <HubHero s={s} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'ana', label: L("KARİYER") },
          { key: 'gelisim', label: L("GELİŞİM"), badge: s.puan + perkPointsFree(s) },
          { key: 'siralama', label: L("SIRALAMA") },
          { key: 'gecmis', label: L("PROFİL") },
        ]}
      />

      {tab === 'ana' ? (
        <>
          <CoachTip s={s} act={act} id="hub" />
          <RewardCard s={s} act={act} />
          <FatigueCard s={s} act={act} />
          {banned(s) ? (
            <Notice color={C.red} icon="cancel" action={<Button label={L("Cezanı çek (zamanı ilerlet)")} icon="timer-sand" tone="ghost" onPress={() => act((x) => { x.haberler.unshift(serveBan(x)); })} />}>
              {s.ceza?.sebep}{L(". Men cezan sürüyor:")}{' '}{banWeeksLeft(s)} {L("hafta kaldı.")}
            </Notice>
          ) : null}
          {untreated(s) ? (
            <Notice color={C.red} icon="alert">
              
              {L("Tedavi edilmemiş hastalık (")}{s.hastalik!.ad}{L("). Sağlığın her hafta düşüyor. Gece hayatı ekranından tedavi ol.")}
            </Notice>
          ) : null}
          {(s.hayvanlar ?? []).some((p) => p.hasta || p.mutluluk < 30) ? (
            <Notice color={C.orange} icon="paw">
              {(s.hayvanlar ?? []).filter((p) => p.hasta || p.mutluluk < 30).map((p) => p.ad).join(', ')} {L("ilgi bekliyor (Mağaza → Hayvan).")}
            </Notice>
          ) : null}
          {dopingActive(s) ? (
            <Notice color={C.orange} icon="needle">
              
              {L("Doping kürü etkide:")}{' '}{s.doping!.kalan} {L("dövüş kaldı. Her dövüşten sonra test riski var.")}
            </Notice>
          ) : null}
          {s.hof && !s.hof.goruldu ? (
            <Notice color={C.gold} icon="pillar" action={<Button label={L("Töreni gör")} icon="pillar" tone="gold" onPress={() => act((x) => (x.phase = 'basarimlar'))} />}>
              
              {L("Hall of Fame’e seçildin! Adın artık ölümsüz.")}
            </Notice>
          ) : null}

          {s.tedavi ? (
            <Notice color={C.red} icon="hospital-box">
              {L("🦴 {0}: {1} haftalık sakatlık. Nasıl tedavi olacaksın?", [s.tedavi.ad, s.tedavi.hafta])}
            </Notice>
          ) : null}
          {s.tedavi
            ? treatmentOptions(s).map((o, i) => (
                <Choice
                  key={o.key}
                  n={i + 1}
                  icon={o.icon as IconName}
                  label={`${o.ad} · ${treatmentCostText(o.maliyet)}`}
                  desc={o.aciklama}
                  tone={o.key === 'igne' ? 'red' : 'gold'}
                  disabled={s.para < o.maliyet}
                  onPress={() => act((x) => { chooseTreatment(x, o.key); })}
                />
              ))
            : null}
          {s.itiraz && s.itiraz.dovus === s.gecmis.length ? (
            <Notice
              color={C.orange}
              icon="scale-balance"
              action={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button label={L("İtiraz et · {0}", [appealFeeText(s)])} icon="gavel" tone="gold" disabled={s.para < appealFee(s)} onPress={() => act((x) => { appeal(x); })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={L("Kabullen")} icon="close" tone="ghost" onPress={() => act(dismissAppeal)} />
                  </View>
                </View>
              }
            >
              {L("⚖️ {0} karşısındaki tartışmalı karar herkesin ağzında. Komisyona itiraz edebilirsin: kabul edilirse sonuç No Contest olur (şans ~%{1}).", [s.itiraz.rakip, Math.round(appealChance(s) * 100)])}
            </Notice>
          ) : null}
          {s.boksTeklif ? (
            <Notice
              color={C.gold}
              icon="boxing-glove"
              action={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button label={L("Kabul et")} icon="boxing-glove" tone="gold" onPress={() => act(acceptCrossover)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={L("Reddet")} icon="close" tone="ghost" onPress={() => act(declineCrossover)} />
                  </View>
                </View>
              }
            >
              {L("🥊 SÜPER MAÇ TEKLİFİ: Boks efsanesi {0} “{1}” ({2}) seninle boks ringinde karşılaşmak istiyor. Ücret {3}. Tekme yok, güreş yok, sadece yumruk.", [s.boksTeklif.boksor.ad, s.boksTeklif.boksor.lakap, s.boksTeklif.boksor.rekor, money(s.boksTeklif.ucret)])}
            </Notice>
          ) : null}
          {s.podcast && !s.podcast.sonuc ? (
            <Notice
              color={C.gold}
              icon="microphone"
              action={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button label={L("Stüdyoya git")} icon="microphone" tone="gold" onPress={() => act((x) => (x.phase = 'podcast'))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={L("Reddet")} icon="close" tone="ghost" onPress={() => act(declinePodcast)} />
                  </View>
                </View>
              }
            >
              {L("🎙️ {0} seni konuk etmek istiyor. Sunucu {1} üç soru soracak. Davet bir sonraki maçına kadar geçerli.", [s.podcast.show, s.podcast.host])}
            </Notice>
          ) : null}
          {s.kriz ? (
            <Notice color={C.red} icon="fire-alert" action={<Button label={s.kriz.sonuc ? L("Sonucu gör") : L("Müdahale et")} icon="cellphone-message" tone="red" onPress={() => act((x) => (x.phase = 'sosyal'))} />}>
              {s.kriz.sonuc ? L("Sosyal medya krizi sonuçlandı.") : L("🔥 Sosyal medyada kriz var: {0}. Gündem ısısı {1}.", [crisisTitle(s.kriz), s.kriz.isi])}
            </Notice>
          ) : null}
          {pendingBouts(s) ? (
            <Notice color={C.orange} icon="bullhorn" action={<Button label={L("Köşesine geç")} icon="weight-lifter" tone="gold" onPress={() => act((x) => (x.phase = 'salon'))} />}>
              {L("Öğrencilerinden {0} kişinin maçı var. Köşede sen dur!", [pendingBouts(s)])}
            </Notice>
          ) : null}
          <UccRoadCard s={s} />
          <GrandPrixCard s={s} act={act} />
          <KafesEviInvite s={s} act={act} />
          <BrainCard s={s} act={act} />
          <FightCTA
            title={banned(s) ? L("MEN CEZASI") : L("DÖVÜŞ AYARLA")}
            sub={
              (org.rakipSecimi ? L("Rakibini kendin seç") : L("{0} rakip önerecek", [org.kisa])) +
              (s.stage !== 'amator' ? L(" · Kamp ~{0}", [money(campCostPreview(s))]) : '') +
              (injured ? L(" · ⚠️ Sakatsın") : '')
            }
            disabled={banned(s)}
            onPress={() => act(findNextFight)}
          />
          <FirstStepsCard s={s} act={act} />
          {featureOpen(s, 'etkinlik') ? <SpecialEventCard s={s} act={act} /> : null}
          {featureOpen(s, 'etkinlik') ? <EventCard s={s} act={act} /> : null}
          {featureOpen(s, 'hedef') ? <GoalsCard s={s} act={act} /> : null}

          <HubCategories
            cat={hubCat}
            setCat={setHubCat}
            tiles={[
              { cat: 'antrenman', show: true, badge: s.sakatliklar.length || null, node: <ActionTile key="dinlen" icon="bed" label={L("Dinlen")} sub={L("Sağlık {0}/100", [s.saglik])} accent={C.green} selected={resting} onPress={() => { setResting(!resting); setWeightOpen(false); }} badge={s.sakatliklar.length || null} /> },
              { cat: 'antrenman', show: true, badge: (s.sponsorTeklif ?? []).length || null, node: <ActionTile key="takim" icon="whistle" label={L("Takım")} sub={`${(s.sponsorlar ?? []).length} sponsor`} accent={C.blue} badge={(s.sponsorTeklif ?? []).length || null} onPress={() => act((x) => (x.phase = 'takim'))} /> },
              {
                cat: 'antrenman',
                show: featureOpen(s, 'salon'),
                badge: isNewFeature(s, 'salon') || pendingBouts(s) || null,
                node: (
                  <ActionTile
                    key="salon"
                    icon="weight-lifter"
                    label={L("Salonum")}
                    sub={s.salon ? L("#{0} dünyada · {1}/hafta", [s.salon.sira ?? '-', `${weeklyGymNet(s.salon) >= 0 ? '+' : '-'}${money(Math.abs(weeklyGymNet(s.salon)))}`]) : L("Kendi salonunu aç")}
                    accent={C.orange}
                    badge={isNewFeature(s, 'salon') ? L("YENİ") : pendingBouts(s) || null}
                    onPress={() => act((x) => (seeFeature(x, 'salon'), (x.phase = 'salon')))}
                  />
                ),
              },
              { cat: 'antrenman', show: (true) && featureOpen(s, 'vucut'), badge: isNewFeature(s, 'vucut') || null, node: <ActionTile key="vucut" icon="human" label={L("Vücudum")} sub={`${ageStage(s.fighter.yas).ad}${(s.izler ?? []).length ? ` · ${L("{0} iz", [(s.izler ?? []).length])}` : ''}`} accent="#ff8a5c" badge={isNewFeature(s, 'vucut') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'vucut'), (x.phase = 'vucut')))} /> },
              { cat: 'antrenman', show: featureOpen(s, 'siklet'), badge: isNewFeature(s, 'siklet') || null, node: <ActionTile key="siklet" icon="scale-balance" label={L("Sıklet")} sub={s.sampiyon ? L("Çift kemere git") : WEIGHT_CLASSES[s.fighter.siklet].ad} accent={C.orange} selected={weightOpen} badge={isNewFeature(s, 'siklet') ? L("YENİ") : null} onPress={() => { act((x) => seeFeature(x, 'siklet')); setWeightOpen(!weightOpen); setResting(false); }} /> },
              { cat: 'yasam', show: true, badge: null, node: <ActionTile key="magaza" icon="shopping" label={L("Mağaza")} sub={weeklyBusinessIncome(s) ? `+${money(weeklyBusinessIncome(s))}/hafta` : L("Ekipman · yaşam · tatil")} accent={C.gold} onPress={() => act((x) => (x.phase = 'magaza'))} /> },
              { cat: 'yasam', show: (true) && featureOpen(s, 'evim'), badge: isNewFeature(s, 'evim') || null, node: <ActionTile key="evim" icon="home-heart" label={L("Evim")} sub={houseLevel(s) ? L("Kupalar, fotoğraflar, odalar") : L("Henüz evin yok")} accent="#f4a261" badge={isNewFeature(s, 'evim') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'evim'), (x.phase = 'evim')))} /> },
              { cat: 'yasam', show: (!!s.fighter.memleket) && featureOpen(s, 'memleket'), badge: isNewFeature(s, 'memleket') || null, node: <ActionTile key="memleket" icon="home-city" label={L("Memleketim")} sub={L("{0} · {1}/5 aşama", [s.fighter.memleket, (s.memleketKart?.asamalar ?? []).length])} accent="#f08a5d" badge={isNewFeature(s, 'memleket') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'memleket'), (x.phase = 'memleket')))} /> },
              { cat: 'yasam', show: (true) && featureOpen(s, 'tatil'), badge: isNewFeature(s, 'tatil') || null, node: <ActionTile key="tatil" icon="beach" label={L("Tatil")} sub={L("{0} kartpostal", [(s.hatiralar ?? []).filter((h) => h.kat === 'tatil').length])} accent="#2ec4b6" badge={isNewFeature(s, 'tatil') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'tatil'), (x.phase = 'tatil')))} /> },
              { cat: 'yasam', show: true, badge: dmUnread(s) || null, node: <ActionTile key="sosyal" icon="cellphone-message" label={L("Sosyal medya")} sub={dmUnread(s) ? L("{0} yeni mesaj", [dmUnread(s)]) : L("{0} paylaşım", [(s.sosyal ?? []).length])} accent="#3aa8ff" badge={dmUnread(s) || null} onPress={() => act((x) => (x.phase = 'sosyal'))} /> },
              { cat: 'yasam', show: featureOpen(s, 'gece'), badge: isNewFeature(s, 'gece') || null, node: <ActionTile key="gece" icon="glass-cocktail" label={L("Gece hayatı")} sub={s.iliski ? `💞 ${s.iliski.ad}` : L("Randevu · kulüp · oyun salonu")} accent="#fd267a" badge={isNewFeature(s, 'gece') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'gece'), (x.phase = 'gece')))} /> },
              { cat: 'marka', show: featureOpen(s, 'kulup'), badge: isNewFeature(s, 'kulup') || (s.kulup && canActivity(s)) || canFoundClub(s) || null, node: <ActionTile key="kulup" icon="flag-variant" label={L("Taraftar kulübü")} sub={s.kulup ? `${s.kulup.ad} · ${fmtFollowers(members(s))}` : canFoundClub(s) ? L("Kulübünü kur") : L("3B takipçi gerekli")} accent="#ff8fb1" badge={isNewFeature(s, 'kulup') ? L("YENİ") : (s.kulup && canActivity(s)) || canFoundClub(s) ? '!' : null} onPress={() => act((x) => (seeFeature(x, 'kulup'), (x.phase = 'kulup')))} /> },
              { cat: 'marka', show: featureOpen(s, 'hayran'), badge: isNewFeature(s, 'hayran') || canFanMeet(s) || null, node: <ActionTile key="hayran" icon="draw-pen" label={L("Hayran buluşması")} sub={canFanMeet(s) ? L("İmza günü düzenle") : L("Sonraki maçtan sonra")} accent="#ff8fb1" badge={isNewFeature(s, 'hayran') ? L("YENİ") : canFanMeet(s) ? '!' : null} onPress={() => { act((x) => seeFeature(x, 'hayran')); canFanMeet(s) && setFanMeet(true); }} /> },
              { cat: 'marka', show: featureOpen(s, 'lig'), badge: isNewFeature(s, 'lig') || null, node: <ActionTile key="lig" icon="lock-clock" label={L("Organizasyonum")} sub={L("Emekli olunca açılır")} accent={C.faint} badge={isNewFeature(s, 'lig') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'lig'), ((x.pending.sonrakiFaz = 'hub'), (x.phase = 'lig'))))} /> },
              { cat: 'marka', show: featureOpen(s, 'marka'), badge: isNewFeature(s, 'marka') || null, node: <ActionTile key="marka" icon="tag-heart" label={L("Markam")} sub={s.marka ? `${s.marka.ad} · ${money(s.marka.toplam)}` : L("Kendi markanı kur")} accent={C.gold} badge={isNewFeature(s, 'marka') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'marka'), (x.phase = 'marka')))} /> },
              { cat: 'marka', show: featureOpen(s, 'yayin'), badge: isNewFeature(s, 'yayin') || canStream(s) || null, node: <ActionTile key="yayin" icon="broadcast" label={L("Canlı yayın")} sub={canStream(s) ? L("Yayına geç") : followers(s) < STREAM_MIN_FOLLOWERS ? L("5B takipçi gerekli") : L("Sonraki maçtan sonra")} accent="#9146ff" badge={isNewFeature(s, 'yayin') ? L("YENİ") : canStream(s) ? '!' : null} onPress={() => act((x) => { seeFeature(x, 'yayin'); if (canStream(x)) startStream(x); })} /> },
              { cat: 'koleksiyon', show: featureOpen(s, 'basarim'), badge: isNewFeature(s, 'basarim') || null, node: <ActionTile key="basarim" icon="medal" label={L("Başarımlar")} sub={s.hof ? L("🏛 Hall of Fame") : `${(s.basarimlar ?? []).length}/${ACHIEVEMENTS.length}`} accent={C.gold} badge={isNewFeature(s, 'basarim') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'basarim'), (x.phase = 'basarimlar')))} /> },
              { cat: 'koleksiyon', show: featureOpen(s, 'album'), badge: isNewFeature(s, 'album') || unclaimedMilestones(s) + unclaimedSets(s) || null, node: <ActionTile key="album" icon="cards" label={L("Kart Albümü")} sub={L("{0} kart", [(s.kartlar ?? []).length])} accent="#c86bff" badge={isNewFeature(s, 'album') ? L("YENİ") : unclaimedMilestones(s) + unclaimedSets(s) || null} onPress={() => act((x) => (seeFeature(x, 'album'), (x.phase = 'album')))} /> },
              { cat: 'koleksiyon', show: (true) && featureOpen(s, 'muze'), badge: isNewFeature(s, 'muze') || null, node: <ActionTile key="muze" icon="bank" label={L("Hatıralar")} sub={L("{0}/{1} vitrin · {2} anı", [(s.hatiralar ?? []).filter((h) => h.kat === 'muze').length, MUSEUM.length, (s.hatiralar ?? []).length])} accent={C.gold} badge={isNewFeature(s, 'muze') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'muze'), (x.phase = 'muze')))} /> },
              { cat: 'koleksiyon', show: featureOpen(s, 'harita'), badge: null, node: <ActionTile key="pasaport" icon="passport" label={L("Pasaport")} sub={L("{0} damga", [Object.keys(s.damgalar ?? {}).length || visitedCount(s)])} accent="#b23a48" onPress={() => act((x) => (x.phase = 'pasaport'))} /> },
              { cat: 'koleksiyon', show: featureOpen(s, 'luks'), badge: isNewFeature(s, 'luks') || null, node: <ActionTile key="luks" icon="diamond-stone" label={L("Lüks koleksiyon")} sub={(s.luks ?? []).length ? money(luxTotal(s)) : L("Müzayede açık")} accent="#c86bff" badge={isNewFeature(s, 'luks') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'luks'), (x.phase = 'luks')))} /> },
              { cat: 'koleksiyon', show: featureOpen(s, 'harita'), badge: isNewFeature(s, 'harita') || null, node: <ActionTile key="harita" icon="earth" label={L("Dünya turu")} sub={L("{0} şehir · {1} kıta", [visitedCount(s), visitedKitalar(s).length])} accent="#4cc9f0" badge={isNewFeature(s, 'harita') ? L("YENİ") : null} onPress={() => act((x) => (seeFeature(x, 'harita'), (x.phase = 'harita')))} /> },
            ]}
          />
          {fanMeetOpen ? (
            <FanMeetGame
              onClose={() => setFanMeet(false)}
              onDone={(p) => {
                setFanMeet(false);
                act((x) => {
                  fanMeet(x, p);
                });
              }}
            />
          ) : null}
          {resting ? <RestPicker s={s} act={act} onDone={() => setResting(false)} /> : null}
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
                    label={L("{0} sıklete {1} ({2} kg)", [WEIGHT_CLASSES[w.siklet].ad, w.yon === 'yukari' ? L("çık") : 'in', WEIGHT_CLASSES[w.siklet].kg])}
                    desc={L("{0} · 4 hafta adaptasyon", [txt || L("İstatistik değişmez")])}
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
          {/* Yeni başlayana emeklilik düğmesi gösterilmez: 30 yaş ya da 10 maçtan sonra çıkar. */}
          {s.fighter.yas < 30 && s.gecmis.length < 10 ? null : !confirmRetire ? (
            <Pressable onPress={() => setConfirmRetire(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 }}>
              <Icon name="flag-checkered" size={14} color={C.faint} />
              <Text style={{ color: C.faint, fontFamily: F.display, fontSize: 12, letterSpacing: 1 }}>{L("EMEKLİ OL")}</Text>
            </Pressable>
          ) : (
            <Card accent={C.red}>
              <P>{L("Emin misin? Kariyerin burada sona erecek.")}</P>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button label={L("Vazgeç")} tone="ghost" onPress={() => setConfirmRetire(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={L("Emekli ol")} onPress={() => act((x) => (x.phase = 'emeklilik'))} />
                </View>
              </View>
            </Card>
          )}

          <Section>{L("DÖVÜŞ HABERLERİ")}</Section>
          <NewsFeed items={s.haberler.slice(0, newsAll ? 12 : 4)} />
          {s.haberler.length > 4 ? (
            <Pressable onPress={() => setNewsAll(!newsAll)} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 }}>{newsAll ? L("DAHA AZ GÖSTER") : L("TÜM HABERLER")}</Text>
            </Pressable>
          ) : null}
        </>
      ) : tab === 'gelisim' ? (
        <>
          <CoachTip s={s} act={act} id="gelisim" />
          <SkillPanel s={s} act={act} />
          <PerkTree s={s} act={act} />
          <TechniquePanel s={s} act={act} />
          <LegendPanel s={s} act={act} />
        </>
      ) : tab === 'siralama' ? (
        <RankingsTab s={s} act={act} />
      ) : (
        <>
          <ProfilePanel s={s} act={act} />
        </>
      )}
    </Screen>
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
  if (ev.id.startsWith('hikaye:')) return <StoryChapter s={s} act={act} />;
  const aile = ev.id.startsWith('aile:');
  const hoca = ev.id.startsWith('hoca:');
  const medya = ev.id.startsWith('medya:') ? (ev.id.split(':')[1] as MediaKind) : null;
  const donem = ev.id.startsWith('donem:');
  const mektup = ev.id.startsWith('mektup:');
  return (
    <Screen footer={ev.sonuc ? <Button label={L("Devam")} icon="arrow-right" onPress={() => act(closeEvent)} /> : undefined}>
      {ev.id.startsWith('patron_') && OWNERS[s.contract?.org ?? 'ufc'] ? (
        <View style={{ marginBottom: 10 }}>
          <FighterAvatar look={lookFor({ id: `owner-${OWNERS[s.contract?.org ?? 'ufc']!.ad}`, uyruk: OWNERS[s.contract?.org ?? 'ufc']!.uyruk })} size={80} ring={C.gold} />
        </View>
      ) : (
        <View style={gs.eventIcon}>
          <Icon name={aile ? 'baby-face-outline' : hoca ? 'whistle' : donem ? 'compass' : mektup ? 'email-heart-outline' : medya ? (MEDIA_ICON[medya] as IconName) : (EVENT_ICONS[ev.id] ?? 'star-four-points')} size={34} color={aile ? '#ff5c8a' : C.gold} />
        </View>
      )}
      <Title kicker={aile ? L("AİLE ANI") : hoca ? L("ANTRENÖRÜN") : donem ? L("KARİYER KARARI") : mektup ? L("TARAFTAR MEKTUBU") : medya ? L("ÜNLÜLÜK") : L("DÖVÜŞ DIŞI")}>{ev.baslik.replace(/^\S+\s/, '')}</Title>
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
        <Pill text={o.champion ? L("ŞAMPİYON") : o.rank ? `#${o.rank}` : L("Sıralamasız")} icon={o.champion ? 'crown' : 'podium'} color={o.champion ? C.gold : C.dim} />
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
        <Pill text={L("Güçlü: {0}", [d.guclu])} icon="arrow-up-bold-circle" color={C.green} />
        <Pill text={L("Zayıf: {0}", [d.zayif])} icon="alert-octagon" color={C.red} />
      </View>
      <Compare me={me} opp={o.stats} />
      {o.riskMetni ? <Text style={gs.risk}>{o.riskMetni}</Text> : null}
    </>
  );
}

function FightDate({ o, s }: { o: Opponent; s: GameState }) {
  if (!o.macHafta) return null;
  const city = o.sehir ? cityPin(s, o.sehir) : undefined;
  return (
    <View style={gs.date}>
      <Icon name="calendar-clock" size={16} color={C.gold} />
      <Text style={gs.dateText}>
        
        {L("Maç tarihi:")}{' '}<Text style={{ color: C.text }}>{o.macHafta} {L("hafta sonra")}</Text> · {o.macHafta * 7} {L("gün")}
        {city ? <Text style={{ color: C.text }}>{' · 📍 '}{city.ad}</Text> : null}
      </Text>
    </View>
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
            <Button label={L("Kabul et")} icon="handshake" onPress={() => act((x) => pickOpponent(x, 0))} />
            <Button label={L("Reddet (popülerlik -3)")} tone="ghost" onPress={() => act(rejectImposed)} />
          </>
        }
      >
        <Title kicker={ORGS[currentOrg(s)].ad.toUpperCase()} sub={L("Matchmaker telefonda. Senin gücün: {0}.", [myOvr])}>
          
          {L("Dövüş Teklifi")}
        </Title>
        <Card accent={C.red}>
          <OpponentCard o={o} me={me} />
          <FightDate o={o} s={s} />
        </Card>
        {s.reddedilen > 0 ? <P style={{ color: C.orange }}>{L("⚠️ Bu")}{' '}{s.reddedilen + 1}{L(". reddedişin olur. Üçüncüde kontratın feshedilir.")}</P> : null}
      </Screen>
    );
  }
  return (
    <Screen footer={<Button label={L("Geri")} tone="ghost" onPress={() => act((x) => { x.pending = {}; x.phase = 'hub'; })} />}>
      <Title kicker={L("SIRADAKİ DÖVÜŞ")} sub={L("Senin gücün: {0}. Kiminle dövüşeceksin?", [myOvr])}>
        
        {L("Rakip Seçimi")}
      </Title>
      <CoachTip s={s} act={act} id="rakip" />
      {list.map((o, i) => (
        <Card key={o.id} accent={o.zorluk === 1 ? C.red : o.zorluk === -1 ? C.green : C.gold}>
          <OpponentCard o={o} me={me} />
          <FightDate o={o} s={s} />
          <View style={{ marginTop: 12 }}>
            <Button label={L("Bu rakibi seç")} icon="sword-cross" tone={i === 1 ? 'red' : 'ghost'} onPress={() => act((x) => pickOpponent(x, i))} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

// ---------- Kamp ----------

// Kamp akışı 4 aşama: plan (tek ekran ya da kısa haberde adım adım), serbest haftalar, kamp, tartı.
const CAMP_STEPS: { key: CampState['step'][]; label: string }[] = [
  { key: ['hoca', 'planla', 'sure', 'yer', 'focus', 'plan', 'intensity', 'kilo', 'basin'], label: L("Plan") },
  { key: ['takvim', 'haftalik', 'basinsahne', 'duello', 'sakatlik', 'ozet'], label: L("Kamp") },
  { key: ['kesim', 'tarti', 'yuzyuze'], label: L("Tartı") },
];

function CampSteps({ k }: { k: CampState }) {
  const cur = CAMP_STEPS.findIndex((x) => x.key.includes(k.step));
  return (
    <View style={gs.steps}>
      {CAMP_STEPS.map((st, i) => (
        <View key={st.label} style={{ flex: 1, alignItems: 'center' }}>
          <View style={[gs.stepBar, { backgroundColor: i < cur ? C.red : i === cur ? C.gold : C.border }]} />
          <Text style={[gs.stepText, i === cur && { color: C.gold }]}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

const INT_ICONS: Record<Intensity, IconName> = { dusuk: 'meditation', orta: 'dumbbell', yuksek: 'weight-lifter' };
const CUT_ICONS: Record<WeightCut, IconName> = { kademeli: 'food-apple', normal: 'scale-bathroom', sert: 'alert-octagon' };
const PRESS_ICONS: Record<PressChoice, IconName> = { saygili: 'handshake', trash: 'microphone-variant', sessiz: 'account-voice' };

const STEP_TIPS: Partial<Record<CampState['step'], TipId>> = { sure: 'kamp', plan: 'plan' };

function CampHeader({ s, k, act }: { s: GameState; k: CampState; act: Act }) {
  const o = s.pending.rakip!;
  const d = describeOpponent(o);
  return (
    <>
      <CampSteps k={k} />
      <CoachTip s={s} act={act} id={STEP_TIPS[k.step] ?? null} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <OvrBadge value={d.guc} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={gs.kicker}>
              
              {L("KAMP ·")}{' '}{k.hafta} {L("HAFTA")}{k.kisaHaber ? L(" · KISA HABER") : ''}
            </Text>
            <Text style={[gs.oppName, { fontSize: 18 }]}>VS {upName(`${o.ad} ${o.soyad}`, o.uyruk)}</Text>
            <Text style={gs.meta}>
              {d.stil} {L("· Zayıf:")}{' '}<Text style={{ color: C.red }}>{d.zayif}</Text>
            </Text>
          </View>
        </View>
      </Card>
      <HypeMeter s={s} />
      <CountdownButton s={s} onWatched={() => act(watchCountdown)} />
      <PosterCard s={s} act={act} />
    </>
  );
}

export function CampScreen({ s, act }: { s: GameState; act: Act }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const choose = (v: string | number) => act((x) => campChoose(x, v));
  const header = <CampHeader s={s} k={k} act={act} />;
  if (k.step === 'hoca') {
    const c = coachCampPlan(s);
    const rows: [IconName, string][] = [
      ['calendar-check', L("{0} haftalık kamp, kendi salonunda", [c.hafta])],
      ['target', L("Odak: {0} (hocanın uzmanlığı, %35 daha verimli)", [STAT_LABELS[c.focus]])],
      ['strategy', L("Plan: {0}. {1} konusunda rakibinden üstünsün.", [PLANS[c.plan].ad, STAT_LABELS[c.stat]])],
      ['scale-bathroom', L("Orta tempo, normal kilo indirme: sakatlık riski düşük")],
    ];
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={L("Hocanın planıyla başla")} icon="check-bold" tone="gold" onPress={() => choose('kabul')} />
            <Button label={L("Kendim planlayayım")} icon="tune-variant" tone="ghost" onPress={() => choose('kendim')} />
          </View>
        }
      >
        {header}
        <Title kicker={L("HOCAN · {0}", [s.takim.antrenor.toLocaleUpperCase(LOC)])} sub={L("“İlk maçın bu. Kampı ben planladım, sen sadece antrenmana odaklan. İleride bunları kendin seçeceksin.”")}>
          {L("İlk Kampın Hazır")}
        </Title>
        <Card accent={C.gold}>
          {rows.map(([icon, t]) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
              <Icon name={icon} size={18} color={C.gold} />
              <Text style={{ flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>{t}</Text>
            </View>
          ))}
        </Card>
      </Screen>
    );
  }
  if (k.step === 'planla')
    return (
      <CampPlanner
        s={s}
        act={act}
        choose={choose}
        steps={
          <>
            <CampSteps k={k} />
            <CoachTip s={s} act={act} id="kamp" />
          </>
        }
      />
    );
  if (k.step === 'sure') return <CampLengthStep s={s} header={header} choose={choose} />;
  // Serbest haftalar ve kamp haftaları tek ekranda kendiliğinden akar; yalnızca kararlarda durur
  if (k.step === 'takvim' || k.step === 'haftalik') return <CampRun key="kamp-akisi" s={s} header={header} choose={choose} />;
  if (k.step === 'duello') return <TrashTalkDuel key={o.id} s={s} header={header} choose={choose} />;
  if (k.step === 'basinsahne') return <PressConference s={s} header={header} choose={choose} />;
  if (k.step === 'ozet') return <CampSummary s={s} act={act} choose={choose} />;
  if (k.step === 'kesim') return <WeightCutStep s={s} header={header} choose={choose} />;

  if (k.step === 'yer') {
    const open = availableSites(s);
    return (
      <Screen>
        {header}
        <Title sub={L("{0} haftalık kamp. Masraflar kamp bitince ödenir. Bakiye: {1}", [k.hafta, money(s.para)])}>{L("Kamp Yeri")}</Title>
        {CAMP_SITES.map((site) => {
          const q = campQuote(s, site.id, k.hafta);
          const locked = !open.includes(site);
          const afford = q.toplam === 0 || s.para >= q.toplam;
          const pills = [
            site.bonusStat ? L("🔥 {0} odağına +%30", [STAT_LABELS[site.bonusStat]]) : site.salonUcreti && s.takim.uzmanlik ? L("🔥 {0} odağına +%35", [STAT_LABELS[s.takim.uzmanlik]]) : null,
            L("Gelişim ×{0}", [site.carpan]),
            site.risk !== 1 ? L("Sakatlık riski ×{0}", [site.risk]) : null,
            site.puan ? L("+{0} gelişim puanı", [site.puan]) : null,
          ].filter(Boolean);
          return (
            <Choice
              key={site.id}
              icon={site.ikon as IconName}
              label={`${site.ad} · ${q.toplam ? money(q.toplam) : L("Ücretsiz")}`}
              desc={
                locked
                  ? L("🔒 {0} geçince açılır.", [site.minStage === 'buyuk' ? L("Büyük organizasyona") : L("Profesyonel kariyere")])
                  : `${site.aciklama}\n${pills.join(' · ')}${q.salon ? `\nSalon: ${money(q.salon)}` : ''}${q.yer ? L("{0}Kamp yeri: {1}", [q.salon ? ' + ' : '\n', money(q.yer)]) : ''}${!afford ? L("\n❌ Bakiye yetersiz") : ''}`
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
        <Title sub={L("Bu kampta hangi alana yükleneceksin?")}>{L("Odak Alanı")}</Title>
        {STAT_KEYS.map((st: StatKey) => (
          <Choice key={st} icon={STAT_ICONS[st]} label={STAT_LABELS[st]} desc={L("Şu an: {0}", [s.fighter.stats[st]])} onPress={() => choose(st)} />
        ))}
      </Screen>
    );
  if (k.step === 'plan')
    return (
      <Screen>
        {header}
        <Title kicker={L("OYUN PLANI")} sub={coachIntro(s, o)}>
          
          {L("Strateji Odası")}
        </Title>
        {k.kesif ? (
          <ScoutReportCard o={o} />
        ) : (
          <AdOffer
            icon="file-search"
            title={L("Detaylı keşif raporu")}
            desc={L("Rakibin dövüş alışkanlıklarını ve ona karşı en etkili taktiği öğren.")}
            onReward={() => act(claimScout)}
          />
        )}
        <PlanPicker s={s} onPick={(p) => choose(p)} />
      </Screen>
    );
  if (k.step === 'intensity')
    return (
      <Screen>
        {header}
        <Title sub={L("Sağlık: {0}/100", [s.saglik])}>{L("Antrenman Yoğunluğu")}</Title>
        {(Object.keys(INTENSITY) as Intensity[]).map((p) => (
          <Choice key={p} icon={INT_ICONS[p]} label={INTENSITY[p].ad} desc={INTENSITY[p].aciklama} onPress={() => choose(p)} />
        ))}
      </Screen>
    );
  if (k.step === 'kilo')
    return (
      <Screen>
        {header}
        <Title sub={ORGS[currentOrg(s)].hidrasyon ? L("⚠️ ZEN’de hidrasyon testi var: sert kilo verme maçı iptal ettirebilir.") : L("Tartı dövüşten bir gün önce.")}>
          
          {L("Kilo Verme")}
        </Title>
        {(Object.keys(WEIGHT_CUTS) as WeightCut[]).map((p) => (
          <Choice
            key={p}
            icon={CUT_ICONS[p]}
            label={WEIGHT_CUTS[p].ad + (p === 'kademeli' ? ` · ${cutCost(s) ? money(cutCost(s)) : L("Diyetisyenin var")}` : '')}
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
        <Title sub={L("{0} ({1}) mikrofonu aldı ve sana döndü. Salon sessiz.", [o.soyad, o.kisilik])}>{L("Basın Toplantısı")}</Title>
        {(Object.keys(PRESS) as PressChoice[]).map((p) => (
          <Choice key={p} icon={PRESS_ICONS[p]} label={PRESS[p].ad} desc={PRESS[p].aciklama} onPress={() => choose(p)} />
        ))}
      </Screen>
    );
  if (k.step === 'sakatlik')
    return (
      <Screen>
        {header}
        <Title kicker={L("KAMPTA KÖTÜ HABER")}>{L("Sakatlık!")}</Title>
        <Card accent={C.orange}>
          <P style={{ marginBottom: 0 }}>
            {k.sakatlik!.ad}{L(". Doktor")}{' '}{k.sakatlik!.hafta} {L("haftalık iyileşme öngörüyor. Dövüşürsen")}{' '}{STAT_LABELS[k.sakatlik!.stat]} -{k.sakatlik!.ceza} {L("ile çıkarsın.")}
          </P>
        </Card>
        <Choice icon="boxing-glove" label={L("Yine de dövüş")} desc={L("Ücret ve sıralama fırsatı kaçmasın.")} onPress={() => choose(0)} />
        <Choice icon="medical-bag" label={L("Maçtan çekil")} desc={L("Ücret yok, popülerlik -3. Ama sağlığın önemli.")} tone="plain" onPress={() => choose(1)} />
      </Screen>
    );
  if (k.step === 'yuzyuze')
    return (
      <Screen footer={k.yuzyuze ? <Button label={L("Dövüş gecesi")} icon="bell-ring" tone="gold" onPress={() => choose(0)} /> : undefined}>
        <Title kicker={L("TARTI SAHNESİ")} sub={L("Kameralar flaş patlatıyor. Güvenlik görevlileri hazırda bekliyor.")}>
          
          {L("Face to Face")}
        </Title>
        <CoachTip s={s} act={act} id="yuzyuze" />
        <HypeMeter s={s} />
        <FaceOffStage s={s} />
        {!k.yuzyuze ? (
          <>
            <Text style={gs.faceAsk}>{k.rakipHamle ? L("Tepkini seç") : L("İlk hamle senin")}</Text>
            {FACEOFF.map((f, i) => (
              <Choice key={f.key} n={i + 1} icon={f.ikon as IconName} label={f.ad} desc={f.aciklama} tone="gold" onPress={() => choose(f.key)} />
            ))}
          </>
        ) : (
          <>
            <Text style={gs.faceAsk}>{L("Dövüş gecesi kafese nasıl gireceksin?")}</Text>
            {WALKOUT_STYLES.map((w, i) => (
              <Choice key={w.key} n={i + 1} icon={w.ikon as IconName} label={w.ad} desc={w.aciklama} tone="gold" selected={(k.giris ?? 'sakin') === w.key} onPress={() => choose(`giris:${w.key}`)} />
            ))}
          </>
        )}
      </Screen>
    );
  // tarti
  return (
    <Screen footer={<Button label={k.iptal ? L("Geri dön") : L("Yüz yüze gel")} icon={k.iptal ? 'arrow-left' : 'account-multiple'} tone={k.iptal ? 'ghost' : 'gold'} onPress={() => choose(0)} />}>
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

export { PostFightScreen } from './PostFightScreen';

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
    <Screen footer={amateur ? <Button label={L("Şimdilik amatörde kal")} tone="ghost" onPress={() => act(stayAmateur)} /> : undefined}>
      <Title kicker={L("MENAJERİN TELEFONU SUSMUYOR")} sub={s.pending.teklifMetni}>
        
        {L("Kontrat Teklifleri")}
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
              <Stat label={L("Dövüş")} value={`${o.dovus}`} />
              <Stat label={L("Ücret")} value={money(o.ucret)} gold />
              <Stat label={L("Galibiyet")} value={`+${money(o.bonus)}`} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill text={o.munhasir ? L("Münhasır") : L("Münhasır değil")} icon="lock" color={o.munhasir ? C.orange : C.green} />
              {o.ozel ? <Pill text={o.ozel} icon="file-sign" color={o.fesih ? C.red : C.gold} /> : null}
            </View>
            <View style={{ gap: 8, marginTop: 14 }}>
              {o.masa ? <ContractTablePanel s={s} o={o} act={act} setMsg={setMsg} /> : null}
              <Button label={o.devam ? L("Kontrata devam et") : o.fesih ? L("Kabul et (-{0})", [money(o.fesih)]) : L("Kabul et")} icon="file-sign" tone={ufc || o.org === 'dwcs' ? 'gold' : 'red'} disabled={!!o.fesih && s.para < o.fesih} onPress={() => act((x) => acceptOffer(x, o.id))} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!o.pazarlikYapildi && !o.masa ? (
                  <View style={{ flex: 1 }}>
                    <Button label={L("Pazarlık")} icon="handshake" tone="ghost" onPress={() => act((x) => openTable(x, o.id))} />
                  </View>
                ) : null}
                {offers.length > 1 && !o.devam && !o.fesih ? (
                  <View style={{ flex: 1 }}>
                    <Button label={L("Reddet")} tone="ghost" onPress={() => act((x) => rejectOffer(x, o.id))} />
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

export function RetireScreen({ s, onNew, onDynasty, onComeback, onDoc, onLeague }: { s: GameState; onNew: () => void; onDynasty?: () => void; onComeback?: () => void; onDoc?: () => void; onLeague?: () => void }) {
  const r = s.rekor;
  const donus = comebackOffer(s);
  const ufcChamp = s.unvanlar.some((u) => u.startsWith('UCC'));
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          {onLeague ? <Button label={s.lig ? L("Organizasyonunu yönet: {0}", [s.lig.ad]) : L("Kendi organizasyonunu kur")} icon="office-building" tone="gold" onPress={onLeague} /> : null}
          {onDoc ? <Button label={L("Kariyer belgeselini izle")} icon="movie-open-star" tone="ghost" onPress={onDoc} /> : null}
          {onDynasty ? <Button label={L("Yeni nesil: çocuğunla devam et")} icon="account-child" tone="gold" onPress={onDynasty} /> : null}
          <ShareButton data={careerCard(s)} label={L("Kariyer kartını paylaş")} />
          <Button label={L("Kariyer yuvalarına dön")} icon="folder-account" tone="ghost" onPress={onNew} />
        </View>
      }
    >
      <LinearGradient colors={['#3a2a0a', '#0a0b0e']} style={gs.banner}>
        <Icon name={ufcChamp ? 'crown' : 'flag-checkered'} size={40} color={C.gold} />
        <Text style={gs.bannerTitle}>{ufcChamp ? L("BİR EFSANE VEDA EDİYOR") : L("SON ZİL")}</Text>
        <Text style={gs.bannerSub}>
          {fullName(s.fighter)} · {s.fighter.yas} {L("yaşında eldivenlerini astı")}
        </Text>
      </LinearGradient>
      {donus && onComeback ? (
        <Card accent={C.orange}>
          <Text style={gs.kicker}>{L("📞 {0} YIL SONRA… TELEFON ÇALDI", [donus.yil])}</Text>
          <P>{donus.metin}</P>
          <P dim>
            {L("{0} · 2 maçlık kontrat · maç başı {1}. {2} yaşında döneceksin; yıllar hızını ve kondisyonunu törpüledi.", [ORGS[donus.org].kisa, money(donus.ucret), s.fighter.yas + donus.yil])}
          </P>
          <Button label={L("Son bir dans")} icon="fire" tone="gold" onPress={onComeback} />
        </Card>
      ) : null}
      <StatusPanel s={s} />
      <Card>
        <P>
          
          {L("Profesyonel rekor:")}{' '}{r.g}-{r.m}-{r.b} (KO/TKO {r.ko}{L(", SUB")}{' '}{r.sub}{L(", Karar")}{' '}{r.karar})
        </P>
        <P style={{ marginBottom: 0 }}>{L("Amatör rekor:")}{' '}{s.amator.g}-{s.amator.m}-{s.amator.b}</P>
      </Card>
      <Section>{L("ÜNVANLAR")}</Section>
      {s.unvanlar.length ? s.unvanlar.map((u, i) => <P key={i}>🏆 {u}</P>) : <P dim>{L("Kemer yok. Ama yol yürünmüştü.")}</P>}
      <Section>{L("KAFESTEN SONRA")}</Section>
      <P>🧠 {brainEpilogue(s)}</P>
      <View style={{ marginTop: 12 }}>
        <WikiButton s={s} />
      </View>
    </Screen>
  );
}

const gs = StyleSheet.create({
  faceAsk: { color: C.faint, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#1a1407', borderRadius: 8, borderWidth: 1, borderColor: '#4a3810', paddingHorizontal: 10, paddingVertical: 8 },
  dateText: { color: C.gold, fontFamily: F.semi, fontSize: 13 },
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 4, marginBottom: 4 },
  tab: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: R - 4 },
  tabOn: { backgroundColor: C.red, transform: [{ skewX: '-8deg' }] },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.8, flexShrink: 1, textAlign: 'center' },
  /** Sekme sayacı köşede durur, yazıdan yer çalmaz */
  tabBadge: { position: 'absolute', top: -6, right: -2, backgroundColor: C.gold, borderRadius: 999, minWidth: 18, paddingHorizontal: 4, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card, zIndex: 2 },
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
