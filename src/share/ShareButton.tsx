// "Paylaş" düğmesi + önizleme penceresi. Kart, gizlice çizilen portre ve kemerden bir görsele dönüştürülür.
import { useEffect, useId, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { Belt } from '../ui/Belt';
import { Button, Icon } from '../ui/components';
import { FighterAvatar } from '../ui/FighterAvatar';
import { C, F } from '../ui/theme';
import { CAN_SHARE, renderCard, saveCard, shareCard } from './render';
import type { ShareCardData } from './types';

type Card = NonNullable<Awaited<ReturnType<typeof renderCard>>>;

export function ShareButton({ data, label, tone = 'ghost' }: { data: ShareCardData | null; label?: string; tone?: 'red' | 'gold' | 'ghost' }) {
  const [open, setOpen] = useState(false);
  if (!CAN_SHARE || !data) return null;
  return (
    <>
      <Button label={label ?? L("Paylaş")} icon="share-variant" tone={tone} onPress={() => setOpen(true)} />
      {open ? <ShareModal data={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareModal({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const avatarId = `pa${uid}`;
  const beltId = `pb${uid}`;
  const [card, setCard] = useState<Card | null>(null);
  const [msg, setMsg] = useState('');
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // Gizli çizimler DOM'a yerleşsin diye bir kare beklenir.
    const t = setTimeout(async () => {
      const c = await renderCard(data, avatarId, beltId).catch(() => null);
      if (alive.current) setCard(c);
    }, 80);
    return () => {
      alive.current = false;
      clearTimeout(t);
    };
  }, [data, avatarId, beltId]);

  const onShare = async () => {
    if (!card) return;
    sfx('click');
    const r = await shareCard(card, data.mesaj);
    if (r === 'indirildi') setMsg(L("Görsel indirildi. Galeriden paylaşabilirsin."));
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={sm.back}>
        {/* Ekran dışı: kartın portresi ve kemeri buradan alınır */}
        <View style={sm.hidden} pointerEvents="none">
          <View nativeID={avatarId}>
            <FighterAvatar look={data.look} size={560} ring={data.tur === 'kemer' ? C.gold : C.red} />
          </View>
          {data.kemer ? (
            <View nativeID={beltId}>
              <Belt org={data.kemer.org} siklet={data.kemer.siklet} width={900} />
            </View>
          ) : null}
        </View>

        <View style={sm.box}>
          <View style={sm.head}>
            <Text style={sm.title}>{L("PAYLAŞIM KARTI")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={C.dim} />
            </Pressable>
          </View>
          <View style={sm.preview}>
            {card ? (
              <Image source={{ uri: card.url }} style={sm.img} resizeMode="contain" />
            ) : (
              <View style={sm.wait}>
                <ActivityIndicator color={C.gold} />
                <Text style={sm.waitText}>{L("Kart hazırlanıyor…")}</Text>
              </View>
            )}
          </View>
          {msg ? <Text style={sm.msg}>{msg}</Text> : null}
          <View style={{ gap: 8 }}>
            <Button label={L("Paylaş")} icon="share-variant" tone="gold" disabled={!card} onPress={onShare} />
            <Button
              label={L("Görseli kaydet")}
              icon="download"
              tone="ghost"
              disabled={!card}
              onPress={() => {
                if (card) saveCard(card);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  hidden: { position: 'absolute', left: -5000, top: 0, opacity: 0 },
  box: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 2 },
  preview: { width: '100%', aspectRatio: 9 / 16, maxHeight: 520, alignSelf: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: '#050506' },
  img: { width: '100%', height: '100%' },
  wait: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitText: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  msg: { color: C.green, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
});
