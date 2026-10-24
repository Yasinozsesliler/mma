// Fontlar tek tek içe aktarılır: paket girişinden almak kullanılmayan tüm varyantları da pakete sokar (çevrimdışı indirme boyutu şişer).
import { L, LANG } from './src/i18n';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { Oswald_500Medium } from '@expo-google-fonts/oswald/500Medium';
import { Oswald_700Bold } from '@expo-google-fonts/oswald/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createGame } from './src/engine/character';
import type { GameState } from './src/engine/types';
import { deleteGame, getActiveSlot, loadAllSlots, restoreBackup, saveGame, setActiveSlot, type Slot } from './src/storage';
import { ErrorBoundary } from './src/ui/ErrorBoundary';
import { installErrorLog } from './src/errorLog';
import { installImmersive } from './src/immersive';
import { GymScreen } from './src/ui/GymScreen';
import { warmAnnouncer } from './src/announcer';
import { CreateScreen } from './src/ui/CreateScreen';
import { FightScreen } from './src/ui/FightScreen';
import {
  CampScreen,
  EventScreen,
  HubScreen,
  OffersScreen,
  OpponentScreen,
  PostFightScreen,
  RetireScreen,
} from './src/ui/GameScreens';
import { MenuScreen } from './src/ui/MenuScreen';
import { DailyScreen } from './src/ui/DailyScreen';
import { ShopScreen } from './src/ui/ShopScreen';
import { ArcadeScreen } from './src/ui/ArcadeScreen';
import { SocialScreen } from './src/ui/SocialScreen';
import { TeamScreen } from './src/ui/TeamScreen';
import { CelebrationScreen } from './src/ui/CelebrationScreen';
import { NightlifeScreen } from './src/ui/NightlifeScreen';
import { AchievementsScreen } from './src/ui/AchievementsScreen';
import { AchievementToast } from './src/ui/AchievementToast';
import { checkAchievements } from './src/engine/legacy';
import { AlbumScreen } from './src/ui/AlbumScreen';
import { PodcastScreen } from './src/ui/PodcastScreen';
import { AwardsCeremony } from './src/ui/AwardsCeremony';
import { challengeOnRetire, type ChallengeId } from './src/engine/challenges';
import { markChallenge } from './src/challengePrefs';
import { MerchScreen } from './src/ui/MerchScreen';
import { CrossoverScreen } from './src/ui/CrossoverScreen';
import { StreamScreen } from './src/ui/StreamScreen';
import { StyleScreen } from './src/ui/StyleScreen';
import { WorldMapScreen } from './src/ui/WorldMapScreen';
import { HomeScreen } from './src/ui/HomeScreen';
import { MuseumScreen } from './src/ui/MuseumScreen';
import { PassportScreen } from './src/ui/PassportScreen';
import { LuxuryScreen } from './src/ui/LuxuryScreen';
import { BodyScreen } from './src/ui/BodyScreen';
import { DocumentaryScreen } from './src/ui/DocumentaryScreen';
import { PromoterScreen } from './src/ui/PromoterScreen';
import { HomelandScreen } from './src/ui/HomelandScreen';
import { KafesEviScreen } from './src/ui/KafesEviScreen';
import { FanClubScreen } from './src/ui/FanClubScreen';
import { FadeIn } from './src/ui/anim';
import { acceptComeback } from './src/engine/comeback';
import { awardsDue, prepareAwards } from './src/engine/awards';
import { ensureGoals, refreshStaleGoals } from './src/engine/goals';
import { ensureEvent } from './src/engine/weeklyEvent';
import { ensureSpecial } from './src/engine/specialEvent';
import { popToFollowers } from './src/engine/fame';
import { useSoundScene, type Scene } from './src/audio';
import { initMonetization, PremiumManager } from './src/monetization';
import { applyHeritage, heritageOf, type Heritage } from './src/engine/dynasty';
import { unlockCtx } from './src/engine/cosmetics';
import { refreshUnlocks } from './src/cosmetics';
import { LockerScreen } from './src/ui/LockerScreen';
import { challengeFor, readChallengeFromUrl } from './src/challenge';
import { dayNumber } from './src/engine/daily';
import { initAnalytics, track, trackScreen } from './src/analytics';

readChallengeFromUrl();
import { onNotificationOpen, rescheduleNotifications } from './src/notify';
import { loadDaily } from './src/ui/DailyScreen';
import { socialWelcome } from './src/engine/social';
import { HasTopBar, TopBar } from './src/ui/components';
import { C, F } from './src/ui/theme';
import type { Phase } from './src/engine/types';

const PHASE_LABELS: Record<Phase, string> = {
  hub: L("Kariyer"),
  event: L("Olay"),
  rakipSecimi: L("Rakip Seçimi"),
  kamp: L("Antrenman Kampı"),
  dovus: L("Dövüş Gecesi"),
  dovusSonrasi: L("Dövüş Sonrası"),
  teklifler: L("Kontrat Teklifleri"),
  magaza: L("Mağaza"),
  takim: L("Takım ve Sponsorlar"),
  kumarhane: L("Oyun Salonu"),
  sosyal: L("Sosyal Medya"),
  kutlama: L("Şampiyonluk"),
  gece: L("Gece Hayatı"),
  basarimlar: L("Başarımlar"),
  salon: L("Salonum"),
  album: L("Kart Albümü"),
  podcast: L("Podcast"),
  odul: L("Ödül Töreni"),
  marka: L("Markam"),
  boks: L("Süper Maç"),
  yayin: L("Canlı Yayın"),
  stil: L("Berber ve Dövmeci"),
  harita: L("Dünya Turu"),
  kafesEvi: L("Kafes Evi"),
  kulup: L("Taraftar Kulübü"),
  emeklilik: L("Emeklilik"),
  evim: L("Evim"),
  muze: L("Hatıralar"),
  pasaport: L("Pasaport"),
  luks: L("Lüks Koleksiyon"),
  tatil: L("Tatil"),
  vucut: L("Vücudum"),
  belgesel: L("Kariyer Belgeseli"),
  lig: L("Organizasyonum"),
  memleket: L("Memleketim"),
};

type View_ = 'loading' | 'menu' | 'create' | 'game' | 'daily' | 'locker';

installErrorLog();
installImmersive();

/** Oyun akışındaki önemli anlar Firebase'e olay olarak yazılır (kariyer başlangıcı ayrıca kaydedilir). */
function logTransition(cur: GameState, next: GameState, achievements: number) {
  if (achievements) track('achievement_unlock', { adet: achievements });
  if (cur.phase === next.phase) return;
  const r = next.rekor;
  if (cur.phase === 'dovus' && next.phase === 'dovusSonrasi') {
    const p = next.pending.sonrasi;
    const o = p?.ozet;
    track('fight_end', {
      sonuc: p?.berabere ? 'berabere' : p?.kazandi ? 'galibiyet' : 'maglubiyet',
      yontem: o?.kod,
      raunt: o?.raunt,
      amator: o?.amator,
      unvan: o?.unvan,
      kazanc: o?.kazanc,
      mac_no: r.g + r.m + r.b,
      galibiyet: r.g,
    });
  } else if (next.phase === 'kutlama') track('title_won', { mac_no: r.g + r.m + r.b, galibiyet: r.g });
  else if (next.phase === 'emeklilik') track('career_end', { mac: r.g + r.m + r.b, galibiyet: r.g, maglubiyet: r.m, yas: next.fighter.yas });
  else if (next.phase === 'kamp' && cur.phase === 'rakipSecimi') track('camp_start', { mac_no: r.g + r.m + r.b + 1 });
}

export default function App() {
  const [view, setView] = useState<View_>('loading');
  const [toast, setToast] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [game, setGameState] = useState<GameState | null>(null);
  // 3 kayıt yuvası: menüde hepsi görünür, oyun aktif yuvaya kaydedilir.
  const [saves, setSaves] = useState<(GameState | null)[]>([null, null, null, null, null]);
  const [slot, setSlotState] = useState<Slot>(1);
  const slotRef = useRef<Slot>(1);
  const setSlot = (x: Slot) => {
    slotRef.current = x;
    setSlotState(x);
    setActiveSlot(x);
  };
  const putSave = (x: Slot, g: GameState | null) => setSaves((cur) => cur.map((v, i) => (i === x - 1 ? g : v)));
  // act her zaman en güncel duruma bakar; gecikmeli çağrılar (ör. blackjack) eski durumu ezmesin.
  const gameRef = useRef<GameState | null>(null);
  const setGame = (g: GameState | null) => {
    gameRef.current = g;
    setGameState(g);
  };
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Oswald_500Medium,
    Oswald_700Bold,
  });
  // Font yüklenemezse (ör. çevrimdışı ilk açılış) sistem fontuyla devam edilir.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    warmAnnouncer();
    Promise.all([loadAllSlots(), getActiveSlot()]).then(([all, active]) => {
      setSaves(all);
      slotRef.current = active;
      setSlotState(active);
      setGame(all[active - 1]);
      // Meydan okuma bağlantısıyla gelindiyse ve bugünkü dövüş oynanmadıysa doğrudan Günün Dövüşü.
      const gun = dayNumber();
      setView(challengeFor(gun) && !loadDaily().kayit[gun] ? 'daily' : 'menu');
    });
  }, []);

  /** Motor fonksiyonları durumu yerinde değiştirir; her hamlede kopya alıp otomatik kaydederiz. */
  const act = (fn: (s: GameState) => void) => {
    const cur = gameRef.current;
    if (!cur) return;
    const next: GameState = JSON.parse(JSON.stringify(cur));
    try {
      fn(next);
    } catch (e) {
      // Motor hatası oyunu çökertmez: durum değişmeden kalır, oyuncuya kısa bir uyarı gösterilir.
      console.warn('İşlem hatası:', e);
      setHata(L("Bu işlem şu an yapılamadı. Kariyerin güvende."));
      setTimeout(() => setHata(null), 4000);
      return;
    }
    // Olaylar, sosyal medya, gece hayatı…: popülerlik değişimi takipçiye yansır (maç sonucu kendi hesabını yapar).
    if (!(cur.phase === 'dovus' && next.phase === 'dovusSonrasi') && next.populerlik !== cur.populerlik) popToFollowers(next, next.populerlik - cur.populerlik);
    // Kafes dışındaki başarımlar da (ev, araba, sevgili…) anında açılır.
    const yeni = next.phase === 'emeklilik' ? [] : checkAchievements(next);
    if (next.phase === 'emeklilik') challengeOnRetire(next);
    if (next.meydan?.durum === 'basarili') markChallenge(next.meydan.id);
    if (next.phase === 'hub') {
      refreshStaleGoals(next);
      // Yeni yıla girildiyse ödül töreni
      if (awardsDue(next) && prepareAwards(next)) next.phase = 'odul';
    }
    if (next.phase !== 'emeklilik') {
      ensureEvent(next);
      ensureSpecial(next);
    }
    if (yeni.length) setToast(yeni);
    logTransition(cur, next, yeni.length);
    setGame(next);
    saveGame(next, slotRef.current);
    putSave(slotRef.current, next);
  };

  // Yuvadaki eski kayıt ancak yeni karakter tamamlanınca üzerine yazılır; oluşturmadan geri dönülürse kaybolmaz.
  const [createSlot, setCreateSlot] = useState<Slot>(1);
  const [challenge, setChallenge] = useState<ChallengeId | null>(null);
  const [heritage, setHeritage] = useState<Heritage | null>(null);
  const newCareer = (x: Slot = slotRef.current, ch: ChallengeId | null = null) => {
    setChallenge(ch);
    setHeritage(null);
    setCreateSlot(x);
    setView('create');
  };
  const continueSlot = (x: Slot) => {
    setSlot(x);
    setGame(saves[x - 1]);
    setView('game');
  };
  const removeSlot = (x: Slot) => {
    deleteGame(x);
    putSave(x, null);
    if (x === slotRef.current) setGame(null);
  };

  useEffect(() => {
    refreshUnlocks(unlockCtx(saves, loadDaily()));
  }, [saves, view]);
  // Bildirimler: menüye her dönüşte (günlük dövüş ya da kariyer değişmiş olabilir) yeniden planlanır.
  useEffect(() => {
    if (view !== 'menu') return;
    const g = saves[slotRef.current - 1];
    void rescheduleNotifications(loadDaily(), g && g.phase !== 'emeklilik' ? g.fighter.lakap || g.fighter.ad : undefined);
  }, [view, saves]);
  useEffect(
    () =>
      onNotificationOpen((hedef) => {
        if (hedef === 'gunluk') setView('daily');
        else if (gameRef.current && gameRef.current.phase !== 'emeklilik') setView('game');
      }),
    [],
  );
  // Mağaza sürümü: reklam izni ve reklam SDK'sı açılışta bir kez.
  useEffect(() => {
    initAnalytics(LANG);
    void initMonetization();
  }, []);
  // Android geri tuşu: oyundan ve karakter oluşturmadan menüye döner; menüdeyse uygulamadan çıkar.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'game' || view === 'create' || view === 'daily' || view === 'locker') {
        setView('menu');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [view]);

  const phase = view === 'game' && game ? game.phase : null;
  // Firebase: hangi ekranda ne kadar kalındığı (oyun içinde faz adı ekran adı olur).
  useEffect(() => {
    if (view !== 'loading') trackScreen(phase ?? view);
  }, [view, phase]);
  const scene: Scene = !phase || phase === 'emeklilik' ? 'menu' : phase === 'dovus' || (phase === 'kafesEvi' && game?.kafesEvi?.adim === 'dovus') ? 'fight' : phase === 'kutlama' ? 'celebrate' : 'hub';
  useSoundScene(scene);

  let content;
  if (view === 'loading' || !ready) {
    content = (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  } else if (view === 'menu') {
    content = (
      <MenuScreen
        saves={saves}
        active={slot}
        onNew={(x) => newCareer(x)}
        onChallenge={(id, x) => newCareer(x, id)}
        onContinue={continueSlot}
        onDelete={removeSlot}
        onDaily={() => {
          track('daily_fight_open');
          setView('daily');
        }}
        onLocker={() => setView('locker')}
        onImport={(x, g) => {
          void deleteGame(x).then(() => saveGame(g, x));
          putSave(x, g);
        }}
        onDynasty={(x) => {
          const g = saves[x - 1];
          if (!g) return;
          setHeritage(heritageOf(g));
          setCreateSlot(x);
          setView('create');
        }}
      />
    );
  } else if (view === 'locker') {
    const g = saves[slot - 1] ?? saves.find(Boolean);
    content = <LockerScreen look={g?.fighter.gorunum} onExit={() => setView('menu')} />;
  } else if (view === 'daily') {
    content = <DailyScreen onExit={() => setView('menu')} />;
  } else if (view === 'create') {
    content = (
      <CreateScreen
        heritage={heritage}
        challenge={challenge}
        onBack={() => {
          setHeritage(null);
          setView('menu');
        }}
        onDone={(input, stats) => {
          const s = createGame(input, stats);
          if (input.zorluk) s.zorluk = input.zorluk;
          if (input.meydan) s.meydan = { id: input.meydan, durum: 'devam' };
          if (heritage) applyHeritage(s, heritage);
          setHeritage(null);
          socialWelcome(s);
          ensureGoals(s);
          ensureEvent(s);
          track('career_start', { zorluk: s.zorluk, meydan: input.meydan, hanedan: !!heritage, yuva: createSlot });
          setSlot(createSlot);
          setGame(s);
          // Yuvanın eski kaydı ve yedeği silinir; yeni kariyer temiz başlar.
          void deleteGame(createSlot).then(() => saveGame(s, createSlot));
          putSave(createSlot, s);
          setView('game');
        }}
      />
    );
  } else if (game) {
    const props = { s: game, act };
    switch (game.phase) {
      case 'hub':
        content = <HubScreen {...props} />;
        break;
      case 'event':
        content = <EventScreen {...props} />;
        break;
      case 'rakipSecimi':
        content = <OpponentScreen {...props} />;
        break;
      case 'kamp':
        content = <CampScreen {...props} />;
        break;
      case 'dovus':
        content = <FightScreen {...props} />;
        break;
      case 'dovusSonrasi':
        content = <PostFightScreen {...props} />;
        break;
      case 'teklifler':
        content = <OffersScreen {...props} />;
        break;
      case 'magaza':
        content = <ShopScreen {...props} />;
        break;
      case 'takim':
        content = <TeamScreen {...props} />;
        break;
      case 'kumarhane':
        content = <ArcadeScreen {...props} />;
        break;
      case 'sosyal':
        content = <SocialScreen {...props} />;
        break;
      case 'gece':
        content = <NightlifeScreen {...props} />;
        break;
      case 'basarimlar':
        content = <AchievementsScreen {...props} />;
        break;
      case 'salon':
        content = <GymScreen {...props} />;
        break;
      case 'album':
        content = <AlbumScreen {...props} />;
        break;
      case 'podcast':
        content = <PodcastScreen {...props} />;
        break;
      case 'odul':
        content = <AwardsCeremony {...props} />;
        break;
      case 'marka':
        content = <MerchScreen {...props} />;
        break;
      case 'boks':
        content = <CrossoverScreen {...props} />;
        break;
      case 'yayin':
        content = <StreamScreen {...props} />;
        break;
      case 'stil':
        content = <StyleScreen {...props} />;
        break;
      case 'kulup':
        content = <FanClubScreen {...props} />;
        break;
      case 'kafesEvi':
        content = game.kafesEvi?.durum === 'aktif' ? <KafesEviScreen {...props} /> : <HubScreen {...props} />;
        break;
      case 'harita':
        content = <WorldMapScreen {...props} />;
        break;
      case 'evim':
        content = <HomeScreen {...props} />;
        break;
      case 'muze':
        content = <MuseumScreen {...props} />;
        break;
      case 'pasaport':
        content = <PassportScreen {...props} />;
        break;
      case 'luks':
        content = <LuxuryScreen {...props} />;
        break;
      case 'memleket':
        content = <HomelandScreen {...props} />;
        break;
      case 'lig':
        content = <PromoterScreen {...props} />;
        break;
      case 'belgesel':
        content = <DocumentaryScreen {...props} />;
        break;
      case 'vucut':
        content = <BodyScreen {...props} />;
        break;
      case 'tatil':
        content = <ShopScreen {...props} start="tatil" />;
        break;
      case 'kutlama':
        content = game.kutlama ? <CelebrationScreen {...props} /> : <HubScreen {...props} />;
        break;
      case 'emeklilik':
        content = (
          <RetireScreen
            s={game}
            onNew={() => setView('menu')}
            onComeback={() => act(acceptComeback)}
            onDoc={() => act((x) => ((x.pending.sonrakiFaz = 'emeklilik'), (x.phase = 'belgesel')))}
            onLeague={() => act((x) => ((x.pending.sonrakiFaz = 'emeklilik'), (x.phase = 'lig')))}
            onDynasty={() => {
              setHeritage(heritageOf(game));
              setCreateSlot(slotRef.current);
              setView('create');
            }}
          />
        );
        break;
    }
  }

  const topLabel = view === 'locker' ? L("Dolap") : view === 'daily' ? L("Günün Dövüşü") : view === 'create' ? L("Karakter Oluşturma") : view === 'game' && game ? PHASE_LABELS[game.phase] : null;

  return (
    <SafeAreaProvider>
      <PremiumManager />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Tarayıcıda telefon genişliğinde ortalanır */}
        <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          {topLabel ? <TopBar label={topLabel} onMenu={() => setView('menu')} /> : null}
          <HasTopBar.Provider value={!!topLabel}>
            <ErrorBoundary
              key={view + (game?.phase ?? '')}
              onMenu={() => setView('menu')}
              onRestore={
                view === 'game'
                  ? () =>
                      void restoreBackup(slotRef.current).then((b) => {
                        if (b) {
                          setGame(b);
                          putSave(slotRef.current, b);
                        }
                        setView('menu');
                      })
                  : undefined
              }
            >
              <FadeIn key={view === 'game' && game ? game.phase : view} style={{ flex: 1 }}>
                {content}
              </FadeIn>
            </ErrorBoundary>
          </HasTopBar.Provider>
          {hata ? (
            <View style={{ position: 'absolute', top: 70, left: 16, right: 16, backgroundColor: '#3a0d12', borderColor: C.red, borderWidth: 1, borderRadius: 10, padding: 12 }}>
              <Text style={{ color: C.text, fontFamily: F.semi, fontSize: 13, textAlign: 'center' }}>{hata}</Text>
            </View>
          ) : null}
          {view === 'game' ? <AchievementToast items={toast} onDone={() => setToast([])} /> : null}
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
