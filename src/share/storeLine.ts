// Paylaşım kartlarındaki mağaza satırı: iOS'ta App Store (Apple başka platform adı geçmesine izin vermez), diğerlerinde Google Play.
import { Platform } from 'react-native';
import { L } from '../i18n';

export const storeLine = () => (Platform.OS === 'ios' ? L("App Store’da ücretsiz") : L("Google Play’de ücretsiz"));
