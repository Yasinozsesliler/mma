// Yeni görünüm: Patron modu. Ofis sahnesi (gece şehri manzaralı patron odası), organizasyonun kendi renginde ve
// adıyla arena (mekân büyüdükçe depo salonundan stadyuma), gece afişi bandı ve maç kartı zemini.
// Yalnızca görünüm: Patron oyun kodu ve satın alma akışı değişmez.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { MekanId, PatronRun } from '../engine/patron';
import { ArenaBackdrop } from './ArenaBackdrop';
import { LIGHTS_ART, type ArenaTier } from './arenaArt';
import { CoverImage } from './CoverImage';

const OFFICE = require('../../assets/art/office.jpg');

/** Mekân → arena büyüklüğü: depo salonu, spor salonu, arena, stadyum. */
export const MEKAN_TIER: Record<MekanId, ArenaTier> = { salon: 0, spor: 1, arena: 2, stadyum: 3 };

/** Patron ofisi arka planı; üstüne organizasyonun rengi bindirilir. */
export function OfficeBg({ renk, dim = 0.35 }: { renk: string; dim?: number }) {
  return (
    <>
      <CoverImage source={OFFICE} iw={1000} ih={500} align="center" />
      <LinearGradient colors={[renk + '40', `rgba(8,9,11,${dim})`, 'rgba(8,9,11,0.97)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
    </>
  );
}

/** Organizasyonun arenası: zeminde kendi kısa adı ve tam adı, ışıklar kendi renginde. */
export function OrgArena({ org, mekan, dim = 0.15 }: { org: PatronRun['org']; mekan: MekanId; dim?: number }) {
  return <ArenaBackdrop tier={MEKAN_TIER[mekan]} org={org.kisa} sub={org.ad.toLocaleUpperCase() === org.kisa.toLocaleUpperCase() ? '' : org.ad} tint={org.renk} dim={dim} />;
}

/** Gece afişi bandı arka planı: mekânın ışıkları, organizasyon rengiyle. */
export function NightBandBg({ renk, mekan }: { renk: string; mekan: MekanId }) {
  return (
    <>
      <CoverImage source={LIGHTS_ART[MEKAN_TIER[mekan]]} iw={936} ih={468} align="top" />
      <LinearGradient colors={[renk + '55', 'rgba(8,9,11,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
    </>
  );
}

/** Maç kartı zemini: kırmızı ve mavi köşe yarıları, ortada eğik çizgi. */
export function BoutBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#5a0812', '#14080b']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={[StyleSheet.absoluteFill, { right: '50%' }]} />
      <LinearGradient colors={['#0d2257', '#070b18']} start={{ x: 1, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, { left: '50%' }]} />
      <View style={b.slash} />
    </View>
  );
}

const b = StyleSheet.create({
  slash: { position: 'absolute', top: -20, bottom: -20, left: '50%', width: 2, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '14deg' }] },
});
