/**
 * Hustota rozložení. Celé "zhuštění" je jediný parametr t v intervalu 0..1:
 *   t = 0   -> původní vzhled (A4, okraje ~20 mm, volné mezery)
 *   t = 1   -> maximální úspora (okraje ~7 mm, minimální mezery)
 * Všechny rozměry se lineárně interpolují, takže "vejít se na N stran" je
 * prosté hledání nejmenšího t, při kterém se dokument vejde.
 */

export interface Density {
  /** Okraje v pt: [vlevo, nahoře, vpravo, dole]. */
  margins: [number, number, number, number];
  fontSize: number;
  lineHeight: number;
  /** Násobič všech vnějších mezer (odstavce, seznamy, bloky, nadpisy). */
  spacing: number;
  /** Násobič velikosti nadpisů. */
  headingScale: number;
  /** Násobič vnitřního odsazení (buňky tabulek, kód, panely). */
  padScale: number;
  /** Násobič velikosti písma v kódu (vůči základu 8,5 pt). */
  codeScale: number;
  /** Síla rámečku/mřížky tabulek v pt. */
  tableBorderWidth: number;
}

const NORMAL: Omit<Density, 'tableBorderWidth'> = {
  margins: [57, 57, 57, 64],
  fontSize: 10.5,
  lineHeight: 1.35,
  spacing: 1,
  headingScale: 1,
  padScale: 1,
  codeScale: 1,
};

const MAXIMUM: Omit<Density, 'tableBorderWidth'> = {
  margins: [20, 20, 20, 20],
  fontSize: 9.5,
  lineHeight: 1.15,
  spacing: 0.3,
  headingScale: 0.75,
  padScale: 0.4,
  codeScale: 0.95,
};

export interface DensityOptions {
  /** Spodní hranice okrajů v mm. Tiskárna si výstup případně nepatrně zmenší o své nutné okraje. */
  minMarginMm: number;
  /** Zápatí s číslem strany potřebuje místo dole. */
  footer: boolean;
  /** Pevná velikost písma v pt; nahradí hodnotu odvozenou z hustoty. */
  fontSizeOverride?: number;
  /** Síla rámečku/mřížky tabulek v pt. */
  tableBorderWidth?: number;
}

export const MM_TO_PT = 72 / 25.4;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function densityAt(t: number, options: DensityOptions): Density {
  const k = Math.min(1, Math.max(0, t));
  const floor = options.minMarginMm * MM_TO_PT;
  const margins = NORMAL.margins.map((v, i) =>
    Math.max(lerp(v, MAXIMUM.margins[i], k), floor),
  ) as Density['margins'];
  if (options.footer) {
    // číslo strany leží v dolním okraji
    margins[3] = Math.max(margins[3], 24);
  }
  return {
    margins,
    fontSize: options.fontSizeOverride ?? lerp(NORMAL.fontSize, MAXIMUM.fontSize, k),
    lineHeight: lerp(NORMAL.lineHeight, MAXIMUM.lineHeight, k),
    spacing: lerp(NORMAL.spacing, MAXIMUM.spacing, k),
    headingScale: lerp(NORMAL.headingScale, MAXIMUM.headingScale, k),
    padScale: lerp(NORMAL.padScale, MAXIMUM.padScale, k),
    codeScale: lerp(NORMAL.codeScale, MAXIMUM.codeScale, k),
    tableBorderWidth: options.tableBorderWidth ?? 0.5,
  };
}

export interface Preset {
  id: 'normal' | 'compact' | 'maximum';
  /** i18n klíč titulku (src/locales), ne text samotný — viz src/main.ts. */
  titleKey: string;
  t: number;
}

export const PRESETS: Preset[] = [
  { id: 'normal', titleKey: 'density.normal', t: 0 },
  { id: 'compact', titleKey: 'density.compact', t: 0.5 },
  { id: 'maximum', titleKey: 'density.maximum', t: 1 },
];

export interface FitResult {
  t: number;
  pages: number;
  /** false = ani při t = 1 se dokument nevešel do požadovaného počtu. */
  ok: boolean;
}

/**
 * Najde nejmenší zhuštění t, při kterém má výstup nejvýš `maxPages` stran.
 * Počet stran nemusí s t klesat monotónně (kvůli zlomům), proto se vrací vždy
 * jen hodnota, kterou jsme skutečně změřili.
 */
export async function fitToPages(
  maxPages: number,
  pagesAt: (t: number) => Promise<number>,
): Promise<FitResult> {
  const loose = await pagesAt(0);
  if (loose <= maxPages) {
    return { t: 0, pages: loose, ok: true };
  }
  const dense = await pagesAt(1);
  if (dense > maxPages) {
    return { t: 1, pages: dense, ok: false };
  }
  let lo = 0;
  let hi = 1;
  let hiPages = dense;
  for (let i = 0; i < 7; i += 1) {
    const mid = (lo + hi) / 2;
    const pages = await pagesAt(mid);
    if (pages <= maxPages) {
      hi = mid;
      hiPages = pages;
    } else {
      lo = mid;
    }
  }
  return { t: hi, pages: hiPages, ok: true };
}
