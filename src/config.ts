import { MarkEdit } from 'markedit-api';

export interface ExtensionConfig {
  /** Vybraná rodina písma textu, nebo undefined pro vestavěné Roboto. */
  fontFamily?: string;
  /** Vybraná rodina písma kódu, nebo undefined pro vestavěný JetBrains Mono. */
  codeFontFamily?: string;
  /** Zhuštění 0..1 (0 normální, 0,5 úsporný, 1 maximální). */
  t?: number;
  /** Cílový počet stran; 0 nebo prázdné = vypnuto. */
  fitPages?: number;
  /** Nejmenší okraj v mm. */
  minMarginMm?: number;
  /** Číslo strany v zápatí. */
  footer?: boolean;
  /** Kód jazyka UI (viz src/locales), nebo undefined pro automatické rozpoznání. */
  language?: string;
  /** Pevná velikost písma v pt, nebo undefined pro automatickou podle hustoty. */
  fontSizeOverride?: number;
  /** Síla rámečku/mřížky tabulek v pt. */
  tableBorderWidth?: number;
  /** Souhlas s anonymizovanou telemetrií (viz docs/PRIVACY.md); výchozí = vypnuto (opt-in). */
  telemetryEnabled?: boolean;
  /** Jednorázová otázka na zapnutí telemetrie už byla zobrazena. */
  telemetryAsked?: boolean;
  /** Náhodné ID generované lokálně při prvním zapnutí telemetrie; nevázané na osobu/soubor. */
  anonId?: string;
}

export const DEFAULTS = {
  t: 0.5,
  fitPages: 0,
  minMarginMm: 5,
  footer: true,
  language: undefined as string | undefined,
  fontSizeOverride: undefined as number | undefined,
  tableBorderWidth: 0.5,
  telemetryEnabled: false,
  telemetryAsked: false,
} as const;

const configPath = (): string =>
  `${MarkEdit.getDirectoryPath('documents')}/tightprint.json`;

let cached: ExtensionConfig = {};

export async function loadConfig(): Promise<ExtensionConfig> {
  try {
    const content = await MarkEdit.getFileContent(configPath());
    cached = content ? (JSON.parse(content) as ExtensionConfig) : {};
  } catch {
    cached = {};
  }
  return cached;
}

export function getConfig(): ExtensionConfig {
  return cached;
}

export async function saveConfig(update: Partial<ExtensionConfig>): Promise<void> {
  cached = { ...cached, ...update };
  await MarkEdit.createFile({
    path: configPath(),
    string: JSON.stringify(cached, null, 2),
    overwrites: true,
  });
}
