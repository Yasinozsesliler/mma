// Dövüş sporu ve gençliğe göre görünüm: grappling ve güreşte eldivensiz; Gençlik Yolu'nda figür yaşa göre küçük ve
// ince, sakal, yara ve dövme yok. genc: 0 (12 yaş) … 1 (18 yaş ve sonrası).
import type { Appearance } from '../engine/types';
import type { Sport } from '../engine/sportRules';
import type { Kit } from './rig';

/** Grappling: eldivensiz, rashguard; güreş: eldivensiz, mayo (singlet) */
export const sportKit = (kit: Kit, kural?: Sport): Kit => (kural === 'grappling' ? { ...kit, bare: true, ust: 'rash' } : kural === 'gures' ? { ...kit, bare: true, ust: 'singlet' } : kit);
export const youthLook = (look: Appearance, genc?: number): Appearance => (genc == null ? look : { ...look, sakal: 'yok', yara: false, dovme: false });
/** Figürün boyu (1 = yetişkin) */
export const youthScale = (genc?: number) => (genc == null ? 1 : 0.8 + 0.2 * Math.max(0, Math.min(1, genc)));
/** Figürün kalınlığı (0 = yetişkin, eksi = ince) */
export const youthBuild = (genc?: number) => (genc == null ? 0 : -1.1 * (1 - Math.max(0, Math.min(1, genc))));
/** Karşılaşma ekranında duruş: grappling ve güreşte alçak güreş duruşu */
export const sportPose = (kural?: Sport): 'stance' | 'stanceLow' => (kural === 'grappling' || kural === 'gures' ? 'stanceLow' : 'stance');
