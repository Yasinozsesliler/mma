// Ekran çizilirken hata olursa oyun beyaz ekranda kalmaz: açıklama, menüye dönüş ve son sağlam kayda dönüş sunulur.
import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { L } from '../i18n';
import { Button, Icon } from './components';
import { C, F } from './theme';

type Props = { children: ReactNode; onMenu: () => void; onRestore?: () => void };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('Ekran hatası:', error);
  }

  reset = (fn: () => void) => {
    this.setState({ error: null });
    fn();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView contentContainerStyle={st.wrap}>
        <Icon name="alert-octagon" size={48} color={C.red} />
        <Text style={st.title}>{L("Bir şeyler ters gitti")}</Text>
        <Text style={st.text}>{L("Bu ekran açılırken bir hata oluştu. Kariyerin güvende: menüye dönüp devam edebilirsin. Sorun sürerse son sağlam kayda dön.")}</Text>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          <Button label={L("Menüye dön")} icon="home" tone="gold" onPress={() => this.reset(this.props.onMenu)} />
          {this.props.onRestore ? <Button label={L("Son sağlam kayda dön")} icon="backup-restore" tone="ghost" onPress={() => this.reset(this.props.onRestore!)} /> : null}
        </View>
        <Text style={st.detail} selectable>
          {String(error.message ?? error).slice(0, 300)}
        </Text>
      </ScrollView>
    );
  }
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { color: C.text, fontFamily: F.display, fontSize: 24, textAlign: 'center' },
  text: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  detail: { color: C.faint, fontFamily: F.body, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
