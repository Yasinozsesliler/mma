// Kampta maç afişi: küçük önizleme, oyun içinde paylaşma (takipçi + hype) ve görsel olarak gerçek paylaşım.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sharePhoto } from '../engine/gram';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { posterCard } from '../share/build';
import { POSTER_H, POSTER_W, PosterView } from '../share/PosterView';
import { ShareButton } from '../share/ShareButton';
import { Button, Card, Icon } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const SCALE = 0.62;

export function PosterCard({ s, act }: { s: GameState; act: Act }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const data = posterCard(s);
  if (!data) return null;
  const done = !!s.pending.kamp?.afis;
  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)} style={st.head}>
        <Icon name="image-frame" size={18} color={C.gold} />
        <Text style={st.title}>{L("MAÇ AFİŞİ")}</Text>
        <Text style={st.sub}>{done ? L("Paylaşıldı ✓") : L("Paylaş, hype yükselt")}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.dim} />
      </Pressable>
      {open ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <View style={st.frame}>
            <View style={{ transform: [{ scale: SCALE }], width: POSTER_W, height: POSTER_H }}>
              <PosterView data={data} store={false} />
            </View>
          </View>
          {msg ? <Text style={st.msg}>{msg}</Text> : null}
          {!done ? <Button label={L("Oyunda paylaş")} icon="cellphone-message" tone="gold" onPress={() => act((x) => setMsg(sharePhoto(x, 'afis')))} /> : null}
          <ShareButton data={data} label={L("Görsel olarak paylaş")} />
        </View>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  sub: { flex: 1, color: C.faint, fontFamily: F.semi, fontSize: 12, textAlign: 'right' },
  frame: { width: POSTER_W * SCALE, height: POSTER_H * SCALE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
});
