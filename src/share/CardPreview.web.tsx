// Web: kart tuvalde çizilir (render.web.ts). Portre ve kemer ekran dışında gizlice çizilen SVG'lerden alınır.
import { useEffect, useId, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { L } from '../i18n';
import { Belt } from '../ui/Belt';
import { FighterAvatar } from '../ui/FighterAvatar';
import { C, F } from '../ui/theme';
import { renderCard, saveCard, shareCard } from './render.web';
import type { CardHandle, ShareCardData } from './types';

export function CardPreview({ data, onReady }: { data: ShareCardData; onReady: (h: CardHandle | null) => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const avatarId = `pa${uid}`;
  const beltId = `pb${uid}`;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Gizli çizimler DOM'a yerleşsin diye kısa bir süre beklenir.
    const t = setTimeout(async () => {
      const card = await renderCard(data, avatarId, beltId).catch(() => null);
      if (!alive) return;
      setUrl(card?.url ?? null);
      onReady(card ? { share: (text) => shareCard(card, text), save: () => saveCard(card) } : null);
    }, 80);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, avatarId, beltId]);

  return (
    <>
      <View style={st.hidden} pointerEvents="none">
        <View nativeID={avatarId}>
          <FighterAvatar look={data.look} size={560} ring={data.tur === 'kemer' ? C.gold : data.tur === 'wiki' ? '#a2a9b1' : C.red} bg={data.tur === 'wiki' ? '#eaecf0' : undefined} />
        </View>
        {data.kemer ? (
          <View nativeID={beltId}>
            <Belt org={data.kemer.org} siklet={data.kemer.siklet} width={900} />
          </View>
        ) : null}
      </View>
      {url ? (
        <Image source={{ uri: url }} style={st.img} resizeMode="contain" />
      ) : (
        <View style={st.wait}>
          <ActivityIndicator color={C.gold} />
          <Text style={st.waitText}>{L("Kart hazırlanıyor…")}</Text>
        </View>
      )}
    </>
  );
}

const st = StyleSheet.create({
  hidden: { position: 'absolute', left: -5000, top: 0, opacity: 0 },
  img: { width: '100%', height: '100%' },
  wait: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
});
