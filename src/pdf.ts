import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { CALLOUTS } from './callouts';
import { CODE_BLOCK_LAYOUT } from './codeblocks';
import { monoFontFiles } from './mono-font';
import type { LoadedFont } from './fonts';
import type { Density } from './density';

// vfs_fonts export shape differs across pdfmake 0.2.x releases.
const fonts = pdfFonts as unknown as Record<string, unknown>;
const vfs = (fonts.pdfMake as { vfs?: Record<string, string> } | undefined)?.vfs
  ?? (fonts.vfs as Record<string, string> | undefined)
  ?? (fonts as Record<string, string>);
(pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;

const ROBOTO = {
  normal: 'Roboto-Regular.ttf',
  bold: 'Roboto-Medium.ttf',
  italics: 'Roboto-Italic.ttf',
  bolditalics: 'Roboto-MediumItalic.ttf',
};

const MONO = {
  normal: 'JetBrainsMono-Regular.ttf',
  bold: 'JetBrainsMono-Bold.ttf',
  italics: 'JetBrainsMono-Italic.ttf',
  bolditalics: 'JetBrainsMono-Bold.ttf',
};

const pdfMakeAny = pdfMake as unknown as {
  vfs: Record<string, string>;
  fonts?: Record<string, typeof ROBOTO>;
};

Object.assign(pdfMakeAny.vfs, monoFontFiles);

/**
 * Register fonts for the next export. A custom text font goes in as 'Custom';
 * a custom code font replaces the 'Mono' family, so styles need no changes.
 */
export function registerFonts(text?: LoadedFont, mono?: LoadedFont): void {
  if (text) {
    Object.assign(pdfMakeAny.vfs, text.vfsFiles);
  }
  if (mono) {
    Object.assign(pdfMakeAny.vfs, mono.vfsFiles);
  }
  pdfMakeAny.fonts = {
    Roboto: ROBOTO,
    Mono: mono ? mono.definition : MONO,
    ...(text ? { Custom: text.definition } : {}),
  };
}
registerFonts();

const COLORS = {
  text: '#1f2328',
  muted: '#57606a',
  border: '#d0d7de',
  codeBg: '#f6f8fa',
  link: '#0a5dc2',
  rule: '#e0e5ea',
};

const calloutLayout = (accent: string, d: Density) => ({
  hLineWidth: () => 0,
  vLineWidth: (i: number) => (i === 0 ? 2.5 : 0),
  vLineColor: () => accent,
  paddingLeft: () => 10 * d.padScale,
  paddingRight: () => 10 * d.padScale,
  paddingTop: () => 7 * d.padScale,
  paddingBottom: () => 3 * d.padScale,
});

const makeTableLayouts = (d: Density) => ({
  ...Object.fromEntries(
    Object.values(CALLOUTS).map((c) => [c.layout, calloutLayout(c.accent, d)]),
  ),
  [CODE_BLOCK_LAYOUT]: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 10 * d.padScale,
    paddingRight: () => 10 * d.padScale,
    paddingTop: () => 5 * d.padScale,
    paddingBottom: () => 5 * d.padScale,
  },
  prettyTable: {
    hLineWidth: () => d.tableBorderWidth,
    vLineWidth: () => d.tableBorderWidth,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 8 * d.padScale,
    paddingRight: () => 8 * d.padScale,
    paddingTop: () => 5 * d.padScale,
    paddingBottom: () => 5 * d.padScale,
  },
});

export interface BuiltPdf {
  /** PDF jako base64. */
  data: string;
  pages: number;
}

const HEADING = /^H[1-6]$/;

export function buildPdf(
  html: string,
  title: string,
  useCustomFont: boolean,
  d: Density,
  footer: boolean,
): Promise<BuiltPdf> {
  const S = (m: [number, number, number, number]): [number, number, number, number] =>
    m.map((x) => x * d.spacing) as [number, number, number, number];
  const H = (x: number): number => x * d.headingScale;
  const codeSize = 8.5 * d.codeScale;

  const content = htmlToPdfmake(html, {
    window,
    tableAutoSize: true,
    removeExtraBlanks: true,
    defaultStyles: {
      h1: { fontSize: H(22), bold: true, color: COLORS.text, margin: S([0, 14, 0, 6]) },
      h2: { fontSize: H(17), bold: true, color: COLORS.text, margin: S([0, 12, 0, 5]) },
      h3: { fontSize: H(14), bold: true, color: COLORS.text, margin: S([0, 9, 0, 4]) },
      h4: { fontSize: H(12), bold: true, color: COLORS.text, margin: S([0, 10, 0, 4]) },
      h5: { fontSize: Math.max(H(10.5), d.fontSize), bold: true, color: COLORS.text, margin: S([0, 8, 0, 4]) },
      h6: { fontSize: Math.max(H(10), d.fontSize), bold: true, color: COLORS.muted, margin: S([0, 8, 0, 4]) },
      p: { margin: S([0, 0, 0, 8]) },
      a: { color: COLORS.link, decoration: 'underline' },
      blockquote: {
        margin: S([12, 4, 0, 10]),
        italics: true,
        color: COLORS.muted,
      },
      pre: {
        margin: S([0, 4, 0, 10]),
        font: 'Mono',
        fontSize: codeSize,
        color: COLORS.text,
        preserveLeadingSpaces: true,
      },
      code: {
        font: 'Mono',
        fontSize: codeSize,
        color: '#b53d00',
        background: COLORS.codeBg,
      },
      ul: { margin: S([0, 0, 0, 8]) },
      ol: { margin: S([0, 0, 0, 8]) },
      li: { margin: S([0, 1, 0, 1]) },
      hr: { margin: S([0, 4, 0, 4]), color: COLORS.rule },
      th: { bold: true, fillColor: COLORS.codeBg },
      mark: { background: '#fff8c5' },
      img: { margin: S([0, 4, 0, 10]) },
    },
  }) as Content;

  applyTableLayout(content);
  tightenRules(content, d);
  fitCodeBlocks(content, d);

  let pageCount = 0;
  const docDefinition: TDocumentDefinitions = {
    info: { title },
    pageSize: 'A4',
    pageMargins: d.margins,
    content,
    // Nadpis nikdy nezůstane sám na konci strany.
    pageBreakBefore: (node, followingNodesOnPage) =>
      HEADING.test(String((node as { nodeName?: string }).nodeName ?? '')) &&
      followingNodesOnPage.length === 0,
    styles: {
      codeline: {
        font: 'Mono',
        fontSize: codeSize,
        lineHeight: d.lineHeight / 1.35 * 1.3,
        preserveLeadingSpaces: true,
      },
      footnotes: {
        fontSize: Math.max(9 * d.codeScale, 7.5),
        color: COLORS.muted,
      },
      taskbox: {
        font: 'Mono',
        bold: true,
      },
    },
    defaultStyle: {
      font: useCustomFont ? 'Custom' : 'Roboto',
      fontSize: d.fontSize,
      lineHeight: d.lineHeight,
      color: COLORS.text,
    },
    // Zápatí se volá pro každou stranu; zároveň z něj zjišťujeme počet stran.
    footer: (currentPage, count) => {
      pageCount = count;
      return footer
        ? {
          text: `${currentPage} / ${count}`,
          alignment: 'center',
          fontSize: 7.5,
          color: COLORS.muted,
          margin: [0, 5, 0, 0],
        }
        : { text: '' };
    },
  };

  const layouts = makeTableLayouts(d);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition, layouts).getBase64((data) => resolve({ data, pages: pageCount }));
    } catch (error) {
      reject(error);
    }
  });
}

const SHORT_TABLE_ROWS = 14;
const SHORT_CODE_LINES = 30;

function applyTableLayout(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(applyTableLayout);
    return;
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const table = record.table as { body?: unknown[] } | undefined;
    if (table) {
      const layout = record.layout as string | undefined;
      const rows = table.body?.length ?? 0;
      if (!layout) {
        record.layout = 'prettyTable';
        // markdownové tabulky mají vždy hlavičku; opakuje se na další straně
        (record.table as { headerRows?: number }).headerRows = 1;
        // krátká tabulka se nedělí mezi strany
        if (rows <= SHORT_TABLE_ROWS) {
          record.unbreakable = true;
        }
      } else if (layout === CODE_BLOCK_LAYOUT) {
        const cell = (table.body?.[0] as unknown[] | undefined)?.[0] as { stack?: unknown[] } | undefined;
        if ((cell?.stack?.length ?? 0) <= SHORT_CODE_LINES) {
          record.unbreakable = true;
        }
      } else {
        record.unbreakable = true; // panely (callout) jsou krátké
      }
    }
    Object.values(record).forEach(applyTableLayout);
  }
}

// ---------------------------------------------------------------------------
// Úspora místa: vodorovné čáry a bloky kódu
// ---------------------------------------------------------------------------

const A4_WIDTH = 595.28;
/** Šířka jednoho znaku v JetBrains Mono jako násobek velikosti písma. */
const MONO_ADVANCE = 0.6;
const FLOOR_PLAIN = 7;
const FLOOR_BOX = 5.4;

interface PdfNode {
  nodeName?: string;
  margin?: number[];
  table?: { body?: unknown[][]; codeMaxLen?: number; codeBox?: boolean };
  stack?: PdfNode[];
  text?: unknown;
  fontSize?: number;
  lineHeight?: number;
  [key: string]: unknown;
}

/**
 * html-to-pdfmake dává <hr> pevné okraje 12 pt a pevnou šířku čáry a naše styly
 * ignoruje, proto je opravujeme na hotových uzlech. Za čárou pak nadpis nechá
 * jen malý odstup, ne dvojitou mezeru.
 */
function tightenRules(content: unknown, d: Density): void {
  const width = A4_WIDTH - d.margins[0] - d.margins[2];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        const cur = node[i] as PdfNode;
        const next = node[i + 1] as PdfNode | undefined;
        if (cur?.nodeName === 'HR' && next && HEADING.test(String(next.nodeName ?? '')) && next.margin) {
          next.margin = [next.margin[0], Math.min(next.margin[1], 3 * d.spacing), next.margin[2], next.margin[3]];
        }
        visit(cur);
      }
      return;
    }
    if (!node || typeof node !== 'object') {
      return;
    }
    const record = node as PdfNode;
    if (record.nodeName === 'HR') {
      record.margin = [0, 3 * d.spacing, 0, 3 * d.spacing];
      const canvas = record.canvas as Array<Record<string, unknown>> | undefined;
      canvas?.forEach((line) => {
        line.x2 = width;
        line.lineColor = COLORS.border;
      });
      return;
    }
    Object.values(record).forEach(visit);
  };
  visit(content);
}

/**
 * Každý blok kódu dostane vlastní velikost písma, aby se nejdelší řádek vešel
 * na šířku bez zalomení (zalomené diagramy z box-drawing znaků jsou nečitelné).
 * Dolní mez je záměrně mírná; pod ní se radši lomí. Diagramy mají řádkování 1,0,
 * při kterém na sebe svislé a vodorovné čáry navazují.
 */
function fitCodeBlocks(node: unknown, d: Density): void {
  if (Array.isArray(node)) {
    node.forEach((child) => fitCodeBlocks(child, d));
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  const record = node as PdfNode;
  const cell = record.table?.body?.[0]?.[0] as PdfNode | undefined;
  if (record.layout === CODE_BLOCK_LAYOUT && cell?.stack) {
    const baseSize = 8.5 * d.codeScale;
    const padding = 2 * 10 * d.padScale;
    const avail = A4_WIDTH - d.margins[0] - d.margins[2] - padding;
    const maxLen = record.table?.codeMaxLen ?? 1;
    const isBox = record.table?.codeBox === true;
    const fit = (avail / (maxLen * MONO_ADVANCE)) * 0.99;
    const size = Math.max(isBox ? FLOOR_BOX : FLOOR_PLAIN, Math.min(baseSize, fit));
    const lineHeight = isBox
      ? 1
      : 0.85 + Math.max(0, Math.min(1, (d.lineHeight - 1.15) / 0.2)) * 0.1;
    for (const line of cell.stack) {
      line.fontSize = size;
      line.lineHeight = lineHeight;
      // Spany nesou styl 'codeline' samy, takže přebíjejí písmo řádku.
      if (Array.isArray(line.text)) {
        for (const run of line.text as PdfNode[]) {
          if (run && typeof run === 'object') {
            run.fontSize = size;
            run.lineHeight = lineHeight;
          }
        }
      }
    }
    delete record.marginBottom;
    record.margin = [0, 2 * d.spacing, 0, 6 * d.spacing];
    return;
  }
  Object.values(record).forEach((child) => fitCodeBlocks(child, d));
}
