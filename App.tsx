// Fontlar tek tek içe aktarılır: paket girişinden almak kullanılmayan tüm varyantları da pakete sokar (çevrimdışı indirme boyutu şişer).
import { L } from './src/i18n';
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
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createGame } from './src/engine/character';
import type { GameState } from './src/engine/types';
import { deleteGame, getActiveSlot, loadAllSlots, saveGame, setActiveSlot, type Slot } from './src/storage';
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
import { ShopScreen } from './src/ui/ShopScreen';
import { CasinoScreen } from './src/ui/CasinoScreen';
import { SocialScreen } from './src/ui/SocialScreen';
import { TeamScreen } from './src/ui/TeamScreen';
import { CelebrationScreen } from './src/ui/CelebrationScreen';
import { NightlifeScreen } from './src/ui/NightlifeScreen';
import { AchievementsScreen } from './src/ui/AchievementsScreen';
import { AchievementToast } from './src/ui/AchievementToast';
import { checkAchievements } from './src/engine/legacy';
import { popToFollowers } from './src/engine/fame';
import { useSoundScene, type Scene } from './src/audio';
import { socialWelcome } from './src/engine/social';
import { HasTopBar, TopBar } from './src/ui/components';
import { C } from './src/ui/theme';
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
  kumarhane: L("Kumarhane"),
  sosyal: L("Sosyal Medya"),
  kutlama: L("Şampiyonluk"),
  gece: L("Gece Hayatı"),
  basarimlar: L("Başarımlar"),
  emeklilik: L("Emeklilik"),
};

type View_ = 'loading' | 'menu' | 'create' | 'game';

export default function App() {
  const [view, setView] = useState<View_>('loading');
  const [toast, setToast] = useState<string[]>([]);
  const [game, setGameState] = useState<GameState | null>(null);
  // 3 kayıt yuvası: menüde hepsi görünür, oyun aktif yuvaya kaydedilir.
  const [saves, setSaves] = useState<(GameState | null)[]>([null, null, null]);
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
    Promise.all([loadAllSlots(), getActiveSlot()]).then(([all, active]) => {
      setSaves(all);
      slotRef.current = active;
      setSlotState(active);
      setGame(all[active - 1]);
      setView('menu');
    });
  }, []);

  /** Motor fonksiyonları durumu yerinde değiştirir; her hamlede kopya alıp otomatik kaydederiz. */
  const act = (fn: (s: GameState) => void) => {
    const cur = gameRef.current;
    if (!cur) return;
    const next: GameState = JSON.parse(JSON.stringify(cur));
    fn(next);
    // Olaylar, sosyal medya, gece hayatı…: popülerlik değişimi takipçiye yansır (maç sonucu kendi hesabını yapar).
    if (!(cur.phase === 'dovus' && next.phase === 'dovusSonrasi') && next.populerlik !== cur.populerlik) popToFollowers(next, next.populerlik - cur.populerlik);
    // Kafes dışındaki başarımlar da (ev, araba, sevgili…) anında açılır.
    const yeni = next.phase === 'emeklilik' ? [] : checkAchievements(next);
    if (yeni.length) setToast(yeni);
    setGame(next);
    saveGame(next, slotRef.current);
    putSave(slotRef.current, next);
  };

  // Yuvadaki eski kayıt ancak yeni karakter tamamlanınca üzerine yazılır; oluşturmadan geri dönülürse kaybolmaz.
  const [createSlot, setCreateSlot] = useState<Slot>(1);
  const newCareer = (x: Slot = slotRef.current) => {
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

  const phase = view === 'game' && game ? game.phase : null;
  const scene: Scene = !phase || phase === 'emeklilik' ? 'menu' : phase === 'dovus' ? 'fight' : phase === 'kutlama' ? 'celebrate' : 'hub';
  useSoundScene(scene);

  let content;
  if (view === 'loading' || !ready) {
    content = (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  } else if (view === 'menu') {
    content = <MenuScreen saves={saves} active={slot} onNew={newCareer} onContinue={continueSlot} onDelete={removeSlot} />;
  } else if (view === 'create') {
    content = (
      <CreateScreen
        onBack={() => setView('menu')}
        onDone={(input, stats) => {
          const s = createGame(input, stats);
          socialWelcome(s);
          setSlot(createSlot);
          setGame(s);
          saveGame(s, createSlot);
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
        content = <CasinoScreen {...props} />;
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
      case 'kutlama':
        content = game.kutlama ? <CelebrationScreen {...props} /> : <HubScreen {...props} />;
        break;
      case 'emeklilik':
        content = <RetireScreen s={game} onNew={() => setView('menu')} />;
        break;
    }
  }

  const topLabel = view === 'create' ? L("Karakter Oluşturma") : view === 'game' && game ? PHASE_LABELS[game.phase] : null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Tarayıcıda telefon genişliğinde ortalanır */}
        <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          {topLabel ? <TopBar label={topLabel} onMenu={() => setView('menu')} /> : null}
          <HasTopBar.Provider value={!!topLabel}>{content}</HasTopBar.Provider>
          {view === 'game' ? <AchievementToast items={toast} onDone={() => setToast([])} /> : null}
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
