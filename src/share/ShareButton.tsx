// "Paylaş" düğmesi + önizleme penceresi. Kartın çizimi ve paylaşımı platforma göre CardPreview'dedir.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { L } from '../i18n';
import { Button, Icon } from '../ui/components';
import { C, F } from '../ui/theme';
import { CardPreview } from './CardPreview';
import type { CardHandle, ShareCardData } from './types';

export function ShareButton({ data, label, tone = 'ghost' }: { data: ShareCardData | null; label?: string; tone?: 'red' | 'gold' | 'ghost' }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <>
      <Button label={label ?? L("Paylaş")} icon="share-variant" tone={tone} onPress={() => setOpen(true)} />
      {open ? <ShareModal data={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareModal({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const [handle, setHandle] = useState<CardHandle | null>(null);
  const [msg, setMsg] = useState('');

  const onShare = async () => {
    if (!handle) return;
    sfx('click');
    const r = await handle.share(data.mesaj);
    if (r === 'indirildi') setMsg(L("Görsel indirildi. Galeriden paylaşabilirsin."));
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={sm.back}>
        <View style={sm.box}>
          <View style={sm.head}>
            <Text style={sm.title}>{L("PAYLAŞIM KARTI")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={C.dim} />
            </Pressable>
          </View>
          <View style={sm.preview}>
            <CardPreview data={data} onReady={setHandle} />
          </View>
          {msg ? <Text style={sm.msg}>{msg}</Text> : null}
          <View style={{ gap: 8 }}>
            <Button label={L("Paylaş")} icon="share-variant" tone="gold" disabled={!handle} onPress={onShare} />
            {handle?.save ? <Button label={L("Görseli kaydet")} icon="download" tone="ghost" onPress={() => handle.save?.()} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 2 },
  preview: { width: '100%', aspectRatio: 9 / 16, maxHeight: 520, alignSelf: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: '#050506' },
  msg: { color: C.green, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
});
