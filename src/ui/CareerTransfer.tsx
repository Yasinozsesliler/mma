// Kariyeri taşı: yuvadaki kariyeri kod olarak paylaş (dışa aktar) ya da yapıştırılan koddan boş yuvaya al (içe aktar).
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { shareText } from '../challenge';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { exportCode, importCode } from '../saveCode';
import { Button, Icon } from './components';
import { C, F } from './theme';

/** Yuva kartındaki küçük "dışa aktar" düğmesi. */
export function ExportButton({ save }: { save: GameState }) {
  const [msg, setMsg] = useState('');
  return (
    <>
      <Pressable
        onPress={async () => {
          const r = await shareText(L("YOL: Kafesten Kemere · {0} {1} kariyer kodu (Menü → Kariyer içe aktar):", [save.fighter.ad, save.fighter.soyad]) + '\n\n' + exportCode(save));
          setMsg(r === 'kopyalandi' ? L("Kariyer kodu kopyalandı. Yeni cihazda Menü → Kariyer içe aktar.") : r === 'hata' ? L("Paylaşılamadı, tekrar dene.") : '');
          if (r !== 'paylasildi') setTimeout(() => setMsg(''), 5000);
        }}
        style={st.iconBtn}
        hitSlop={6}
        accessibilityLabel={L("Kariyeri dışa aktar")}
      >
        <Icon name="export-variant" size={18} color={C.faint} />
      </Pressable>
      {msg ? (
        <View style={st.toast}>
          <Text style={st.toastText}>{msg}</Text>
        </View>
      ) : null}
    </>
  );
}

/** Menüdeki "Kariyer içe aktar" satırı ve kod yapıştırma penceresi. */
export function ImportCard({ canImport, onImport }: { canImport: boolean; onImport: (g: GameState) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const submit = () => {
    const g = importCode(code);
    if (!g) return setMsg(L("Kod okunamadı. Tamamını kopyaladığından emin ol."));
    if (!canImport) return setMsg(L("Boş yuva yok. Önce bir kariyeri sil ya da yuvaları artır."));
    onImport(g);
    setCode('');
    setMsg('');
    setOpen(false);
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [st.row, pressed && { borderColor: C.gold }]}>
        <Icon name="import" size={18} color={C.dim} />
        <Text style={st.rowText}>{L("Kariyer içe aktar")}</Text>
        <Icon name="chevron-right" size={18} color={C.faint} />
      </Pressable>
      {open ? (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={st.back}>
            <View style={st.box}>
              <Text style={st.title}>{L("KARİYERİ TAŞI")}</Text>
              <Text style={st.text}>{L("Eski cihazında yuvanın yanındaki dışa aktar düğmesiyle kariyer kodunu al, buraya yapıştır. Kariyer ilk boş yuvaya eklenir.")}</Text>
              <TextInput value={code} onChangeText={setCode} placeholder="YOL1:…" placeholderTextColor={C.faint} multiline style={st.input} autoCorrect={false} autoCapitalize="none" />
              {msg ? <Text style={st.msg}>{msg}</Text> : null}
              <View style={{ gap: 8 }}>
                <Button label={L("İçe aktar")} icon="import" tone="gold" disabled={!code.trim()} onPress={submit} />
                <Button label={L("Vazgeç")} tone="ghost" onPress={() => setOpen(false)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  iconBtn: { padding: 8 },
  toast: { position: 'absolute', left: 0, right: 0, bottom: -44, backgroundColor: '#15120a', borderColor: C.goldDeep, borderWidth: 1, borderRadius: 8, padding: 8, zIndex: 5 },
  toastText: { color: C.gold, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: C.card },
  rowText: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 14 },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  text: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  input: { minHeight: 120, maxHeight: 200, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontFamily: F.body, fontSize: 12, textAlignVertical: 'top', backgroundColor: '#08090b' },
  msg: { color: C.red, fontFamily: F.semi, fontSize: 12 },
});
