export const C = {
  bg: '#040405',
  card: '#0c0d10',
  cardAlt: '#14161a',
  border: '#1c1f25',
  text: '#f1f2f5',
  dim: '#a3a9b5',
  faint: '#6b7280',
  red: '#e63946',
  redDeep: '#8f0a17',
  redDim: '#2a0a0f',
  gold: '#f2c14e',
  goldDeep: '#b07d24',
  green: '#3ecf7a',
  blue: '#3a86ff',
  blueDeep: '#1740a8',
  orange: '#f08a3c',
};

/** Gradyan çiftleri (üst → alt / sol → sağ). */
export const G = {
  red: ['#f0444f', '#a10f1e'] as const,
  gold: ['#f7d57a', '#c8902e'] as const,
  blue: ['#4f93ff', '#1c4fc4'] as const,
  card: ['#101115', '#08090b'] as const,
  hero: ['#2a070c', '#040405'] as const,
};

/** Fontlar: Oswald = başlık/rakam (yayın grafiği havası), Inter = metin. */
export const F = {
  display: 'Oswald_700Bold',
  displayMed: 'Oswald_500Medium',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
};

export const R = 8;

/** 1-100 istatistik değerine göre renk. */
export function statColor(v: number) {
  if (v >= 80) return C.gold;
  if (v >= 65) return C.green;
  if (v >= 45) return C.blue;
  return C.faint;
}
