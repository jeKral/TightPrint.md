import { MarkEdit } from 'markedit-api';
import type { MenuItem } from 'markedit-api';
import { renderMarkdown } from './markdown';
import { buildPdf, registerFonts } from './pdf';
import type { BuiltPdf } from './pdf';
import { DEFAULTS, getConfig, loadConfig, saveConfig } from './config';
import type { ExtensionConfig } from './config';
import { PRESETS, densityAt, fitToPages } from './density';
import { scanFontFamilies, loadFontFamily, isLikelyMonospace } from './fonts';
import type { FontFamily } from './fonts';
import { LOCALES, t, tn, setLocale } from './i18n';

let busy = false;

interface Produced extends BuiltPdf {
  baseName: string;
  /** Výsledek hledání pro "vejít se na N stran"; undefined = vypnuto. */
  fit?: { ok: boolean; wanted: number };
}

const cfg = () => {
  const c = getConfig();
  return {
    t: c.t ?? DEFAULTS.t,
    fitPages: c.fitPages ?? DEFAULTS.fitPages,
    minMarginMm: c.minMarginMm ?? DEFAULTS.minMarginMm,
    footer: c.footer ?? DEFAULTS.footer,
    language: c.language ?? DEFAULTS.language,
    fontSizeOverride: c.fontSizeOverride ?? DEFAULTS.fontSizeOverride,
    tableBorderWidth: c.tableBorderWidth ?? DEFAULTS.tableBorderWidth,
  };
};

async function loadConfiguredFamily(familyName: string | undefined, fallbackLabel: string) {
  if (!familyName) {
    return undefined;
  }
  const families = await scanFontFamilies();
  const family = families.find((f) => f.name === familyName);
  const loaded = family ? await loadFontFamily(family) : undefined;
  if (!loaded) {
    await MarkEdit.showAlert({
      title: t('dialog.fontUnavailable.title'),
      message: t('dialog.fontUnavailable.message', { family: familyName, fallback: fallbackLabel }),
    });
  }
  return loaded;
}

/** Načte vybraná písma do pdfmake; jinak vestavěná. */
async function prepareFonts(): Promise<boolean> {
  const config = getConfig();
  const text = await loadConfiguredFamily(config.fontFamily, 'Roboto');
  const mono = await loadConfiguredFamily(config.codeFontFamily, 'JetBrains Mono');
  registerFonts(text, mono);
  return text !== undefined;
}

async function produce(): Promise<Produced | undefined> {
  const source = MarkEdit.editorAPI.getText();
  if (source.trim().length === 0) {
    await MarkEdit.showAlert(t('dialog.emptyDocument'));
    return undefined;
  }

  const fileInfo = await MarkEdit.getFileInfo();
  const baseName = fileInfo
    ? fileInfo.filePath.split('/').pop()!.replace(/\.(md|markdown|txt)$/i, '')
    : t('file.untitled');

  const useCustomFont = await prepareFonts();
  const { html, title } = await renderMarkdown(source, fileInfo?.parentPath);
  const docTitle = title ?? baseName;
  const { t: density, fitPages, minMarginMm, footer, fontSizeOverride, tableBorderWidth } = cfg();
  const options = { minMarginMm, footer, fontSizeOverride, tableBorderWidth };

  const cache = new Map<number, BuiltPdf>();
  const buildAt = async (at: number): Promise<BuiltPdf> => {
    const hit = cache.get(at);
    if (hit) {
      return hit;
    }
    const built = await buildPdf(html, docTitle, useCustomFont, densityAt(at, options), footer);
    cache.set(at, built);
    return built;
  };

  if (fitPages > 0) {
    const result = await fitToPages(fitPages, async (at) => (await buildAt(at)).pages);
    const built = await buildAt(result.t);
    return { ...built, baseName, fit: { ok: result.ok, wanted: fitPages } };
  }
  return { ...(await buildAt(density)), baseName };
}

async function exportPdf(mode: 'save' | 'print'): Promise<void> {
  if (busy) {
    return;
  }
  busy = true;
  try {
    const result = await produce();
    if (!result) {
      return;
    }
    if (result.fit && !result.fit.ok) {
      const choice = await MarkEdit.showAlert({
        title: t('dialog.notFit.title'),
        message: t('dialog.notFit.message', { wanted: result.fit.wanted, actual: result.pages }),
        buttons: [t('dialog.notFit.continue'), t('dialog.notFit.cancel')],
      });
      if (choice !== 0) {
        return;
      }
    }

    if (mode === 'print') {
      if (typeof MarkEdit.showPrintPanel === 'function') {
        await MarkEdit.showPrintPanel({ type: 'pdf', data: result.data, title: result.baseName });
        return;
      }
      await MarkEdit.showAlert({
        title: t('dialog.noPrintPanel.title'),
        message: t('dialog.noPrintPanel.message'),
      });
    }
    await MarkEdit.showSavePanel({ data: result.data, fileName: `${result.baseName}.pdf` });
  } catch (error) {
    await MarkEdit.showAlert({
      title: t('dialog.exportFailed.title'),
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy = false;
  }
}

function fontMenuItem(key: 'fontFamily' | 'codeFontFamily', family: FontFamily | undefined): MenuItem {
  const name = family?.name;
  return {
    title: name ?? t(key === 'fontFamily' ? 'menu.fontText.default' : 'menu.fontCode.default'),
    state: () => ({ isSelected: getConfig()[key] === name }),
    action: () => { void saveConfig({ [key]: name } as Partial<ExtensionConfig>); },
  };
}

const FIT_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10];
const MARGIN_CHOICES = [3, 5, 7, 10, 15, 20];
const FONT_SIZE_CHOICES = [8, 8.5, 9, 9.5, 10, 10.5, 11, 12];
const TABLE_BORDER_CHOICES = [0, 0.25, 0.5, 0.75, 1, 1.5];

async function askFitPages(): Promise<void> {
  const answer = await MarkEdit.showTextBox({
    title: t('dialog.askFitPages.title'),
    placeholder: t('dialog.askFitPages.placeholder'),
    defaultValue: cfg().fitPages > 0 ? String(cfg().fitPages) : '',
  });
  if (answer === undefined) {
    return;
  }
  const n = Math.floor(Number(answer.trim()));
  if (Number.isFinite(n) && n >= 1 && n <= 999) {
    await saveConfig({ fitPages: n });
  } else {
    await MarkEdit.showAlert(t('dialog.askFitPages.invalid'));
  }
}

/** Prázdný vstup = zpět na automatickou velikost podle hustoty. */
async function askFontSize(): Promise<void> {
  const current = cfg().fontSizeOverride;
  const answer = await MarkEdit.showTextBox({
    title: t('dialog.askFontSize.title'),
    placeholder: t('dialog.askFontSize.placeholder'),
    defaultValue: current !== undefined ? String(current) : '',
  });
  if (answer === undefined) {
    return;
  }
  const trimmed = answer.trim();
  if (trimmed === '') {
    await saveConfig({ fontSizeOverride: undefined });
    return;
  }
  const n = Number(trimmed.replace(',', '.'));
  if (Number.isFinite(n) && n >= 6 && n <= 18) {
    await saveConfig({ fontSizeOverride: n });
  } else {
    await MarkEdit.showAlert(t('dialog.askFontSize.invalid'));
  }
}

async function askTableBorder(): Promise<void> {
  const answer = await MarkEdit.showTextBox({
    title: t('dialog.askTableBorder.title'),
    placeholder: t('dialog.askTableBorder.placeholder'),
    defaultValue: String(cfg().tableBorderWidth),
  });
  if (answer === undefined) {
    return;
  }
  const n = Number(answer.trim().replace(',', '.'));
  if (Number.isFinite(n) && n >= 0 && n <= 3) {
    await saveConfig({ tableBorderWidth: n });
  } else {
    await MarkEdit.showAlert(t('dialog.askTableBorder.invalid'));
  }
}

function languageMenuItem(code: string | undefined): MenuItem {
  return {
    title: code ? LOCALES[code].label : t('menu.language.auto'),
    state: () => ({ isSelected: (cfg().language ?? undefined) === code }),
    action: () => {
      setLocale(code);
      void saveConfig({ language: code }).then(() => {
        void buildMenu();
        openSettingsMenu();
      });
    },
  };
}

// Poznámka k UX: nativní macOS menu se po kliknutí na položku vždy celé
// zavře (chování AppKitu, API pro to nemá žádný "zůstat otevřené" příznak).
// Aby uživatel nemusel pro každou další úpravu znovu procházet File ▸
// Extensions ▸ TightPrint.md, nastavení žije v samostatném kontextovém menu
// ("Nastavení tisku…"), které se po uložení každé volby samo znovu otevře —
// takže lze měnit víc věcí za sebou, aniž by se musel vracet do horního menu.
let cachedFamilies: FontFamily[] = [];

/** Zabalí akci: uloží a znovu otevře nastavení, aby šlo hned upravit další volbu. */
function sticky(mutate: () => void | Promise<void>): () => void {
  return () => { void Promise.resolve(mutate()).then(() => openSettingsMenu()); };
}

function settingsMenuItems(): MenuItem[] {
  const fontSubmenu = (key: 'fontFamily' | 'codeFontFamily'): MenuItem[] => {
    const items: MenuItem[] = [
      { ...fontMenuItem(key, undefined), action: sticky(() => saveConfig({ [key]: undefined } as Partial<ExtensionConfig>)) },
      { separator: true },
    ];
    const withSticky = (f: FontFamily): MenuItem => ({
      ...fontMenuItem(key, f),
      action: sticky(() => saveConfig({ [key]: f.name } as Partial<ExtensionConfig>)),
    });
    if (cachedFamilies.length === 0) {
      items.push({ title: t('menu.fontCode.none'), state: () => ({ isEnabled: false }) });
      return items;
    }
    if (key === 'codeFontFamily') {
      const mono = cachedFamilies.filter(isLikelyMonospace);
      if (mono.length > 0) {
        items.push(...mono.map(withSticky));
        items.push({ separator: true });
        items.push({ title: t('menu.fontCode.all'), children: cachedFamilies.map(withSticky) });
        return items;
      }
    }
    items.push(...cachedFamilies.map(withSticky));
    return items;
  };

  const densityItems: MenuItem[] = PRESETS.map((preset) => ({
    title: t(preset.titleKey),
    state: () => ({ isSelected: cfg().fitPages === 0 && Math.abs(cfg().t - preset.t) < 0.01 }),
    action: sticky(() => saveConfig({ t: preset.t, fitPages: 0 })),
  }));

  const fitItems: MenuItem[] = [
    {
      title: t('menu.fitTo.off'),
      state: () => ({ isSelected: cfg().fitPages === 0 }),
      action: sticky(() => saveConfig({ fitPages: 0 })),
    },
    { separator: true },
    ...FIT_CHOICES.map((n): MenuItem => ({
      title: tn('menu.fitTo.pages', n),
      state: () => ({ isSelected: cfg().fitPages === n }),
      action: sticky(() => saveConfig({ fitPages: n })),
    })),
    { separator: true },
    { title: t('menu.fitTo.other'), action: sticky(() => askFitPages()) },
  ];

  const marginItems: MenuItem[] = MARGIN_CHOICES.map((mm) => ({
    title: `${mm} mm`,
    state: () => ({ isSelected: cfg().minMarginMm === mm }),
    action: sticky(() => saveConfig({ minMarginMm: mm })),
  }));

  const fontSizeItems: MenuItem[] = [
    {
      title: t('menu.fontSize.auto'),
      state: () => ({ isSelected: cfg().fontSizeOverride === undefined }),
      action: sticky(() => saveConfig({ fontSizeOverride: undefined })),
    },
    { separator: true },
    ...FONT_SIZE_CHOICES.map((pt): MenuItem => ({
      title: `${pt} pt`,
      state: () => ({ isSelected: cfg().fontSizeOverride === pt }),
      action: sticky(() => saveConfig({ fontSizeOverride: pt })),
    })),
    { separator: true },
    { title: t('menu.fontSize.other'), action: sticky(() => askFontSize()) },
  ];

  const tableBorderItems: MenuItem[] = TABLE_BORDER_CHOICES.map((pt): MenuItem => ({
    title: pt === 0 ? t('menu.tableBorder.none') : `${pt} pt`,
    state: () => ({ isSelected: Math.abs(cfg().tableBorderWidth - pt) < 0.001 }),
    action: sticky(() => saveConfig({ tableBorderWidth: pt })),
  })).concat([
    { separator: true },
    { title: t('menu.tableBorder.other'), action: sticky(() => askTableBorder()) },
  ]);

  const languageItems: MenuItem[] = [
    languageMenuItem(undefined),
    { separator: true },
    ...Object.keys(LOCALES).map((code) => languageMenuItem(code)),
  ];

  return [
    { title: t('menu.density'), children: densityItems },
    { title: t('menu.fitTo'), children: fitItems },
    { title: t('menu.minMargin'), children: marginItems },
    { title: t('menu.fontSize'), children: fontSizeItems },
    { title: t('menu.tableBorder'), children: tableBorderItems },
    {
      title: t('menu.footer'),
      state: () => ({ isSelected: cfg().footer }),
      action: sticky(() => saveConfig({ footer: !cfg().footer })),
    },
    { separator: true },
    { title: t('menu.fontText'), children: fontSubmenu('fontFamily') },
    { title: t('menu.fontCode'), children: fontSubmenu('codeFontFamily') },
    { separator: true },
    { title: t('menu.language'), children: languageItems },
  ];
}

/** Otevře nastavení jako kontextové menu, které se po každé úpravě sama znovu otevře. */
function openSettingsMenu(): void {
  MarkEdit.showContextMenu(settingsMenuItems());
}

async function buildMenu(): Promise<void> {
  await loadConfig();
  setLocale(cfg().language);
  cachedFamilies = await scanFontFamilies().catch(() => [] as FontFamily[]);

  MarkEdit.addMainMenuItem({
    title: t('menu.title'),
    icon: 'printer',
    children: [
      {
        title: t('menu.print'),
        key: 'P',
        modifiers: ['Command', 'Option'],
        action: () => { void exportPdf('print'); },
      },
      {
        title: t('menu.saveAsPdf'),
        key: 'E',
        modifiers: ['Command', 'Shift'],
        action: () => { void exportPdf('save'); },
      },
      { separator: true },
      {
        title: t('menu.settings'),
        key: ',',
        modifiers: ['Command', 'Option'],
        action: () => { openSettingsMenu(); },
      },
    ],
  });
}

void buildMenu();
