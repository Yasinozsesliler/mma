// Yerel (iOS/Android): paylaşım kartı mağaza sürümünde görüntü yakalama ile eklenecek; şimdilik gizli.
import type { ShareCardData } from './types';

export const CAN_SHARE = false;

type Card = { url: string; file: null };

export async function renderCard(_d: ShareCardData, _avatarId: string, _beltId: string): Promise<Card | null> {
  return null;
}
export async function shareCard(_card: Card, _text: string): Promise<'paylasildi' | 'indirildi' | 'iptal'> {
  return 'iptal';
}
export function saveCard(_card: Card): 'indirildi' {
  return 'indirildi';
}
