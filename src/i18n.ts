import cs from './locales/cs.json';
import en from './locales/en.json';

/**
 * Lokalizace UI pluginu. Jeden plochý JSON soubor na jazyk (`src/locales/*.json`),
 * aby šel komunitní překlad udělat jako jeden čitelný PR bez dotýkání se kódu.
 * Kontext pro překladatele: `src/locales/_context.md`.
 */

type PluralForm = 'one' | 'few' | 'many' | 'other';
type MessageValue = string | Partial<Record<PluralForm, string>>;
export type Messages = Record<string, MessageValue>;

export const LOCALES: Record<string, { label: string; messages: Messages }> = {
  cs: { label: 'Čeština', messages: cs as Messages },
  en: { label: 'English', messages: en as Messages },
};

const FALLBACK_LOCALE = 'en';
let currentLocale = 'cs';

/** Zkusí odvodit jazyk systému; když se nepovede, vrátí undefined. */
export function detectSystemLocale(): string | undefined {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    const base = tag.split('-')[0];
    return base in LOCALES ? base : undefined;
  } catch {
    return undefined;
  }
}

export function setLocale(code: string | undefined): void {
  currentLocale = code && code in LOCALES ? code : (detectSystemLocale() ?? FALLBACK_LOCALE);
}

export function getLocale(): string {
  return currentLocale;
}

function resolve(key: string): MessageValue | undefined {
  return LOCALES[currentLocale]?.messages[key] ?? LOCALES[FALLBACK_LOCALE]?.messages[key];
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** Přeloží obyčejný (nemnožný) text. Chybějící klíč vrátí jako `⟦key⟧`, ať je vidět v UI. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = resolve(key);
  if (typeof value !== 'string') {
    return `⟦${key}⟧`;
  }
  return interpolate(value, vars);
}

/** Přeloží text závislý na počtu `n` podle CLDR plural rules jazyka. */
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const value = resolve(key);
  if (typeof value !== 'object' || value === null) {
    return `⟦${key}⟧`;
  }
  const form = (() => {
    try {
      return new Intl.PluralRules(currentLocale).select(n) as PluralForm;
    } catch {
      return 'other' as PluralForm;
    }
  })();
  const text = value[form] ?? value.other ?? Object.values(value)[0] ?? `⟦${key}⟧`;
  return interpolate(text, { ...vars, n });
}
