// Web sürümü (Vercel / Poki): Firebase Analytics yüklenmez; portalların kendi ölçümü kullanılır.
type Params = Record<string, string | number | boolean | undefined>;

export function initAnalytics(_lang: string) {}
export function setAnalyticsEnabled(_v: boolean) {}
export const useAnalyticsEnabled = () => false;
export function track(_name: string, _params?: Params) {}
export function trackScreen(_screen: string) {}
export function setUserProp(_name: string, _value: string | null) {}
