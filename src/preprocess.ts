/**
 * Předzpracování Markdownu před renderem.
 *
 * Oprava tabulek, jejichž oddělovací řádek je napsaný typografickými pomlčkami
 * (`|—|—|`, `|–|–|`), často po kopii z webu nebo z textových editorů. markdown-it
 * takový řádek nepozná jako tabulku a vytiskne ho jako surový text s pipe znaky.
 * Pomlčky nahradíme `---`; řádky uvnitř ohraničených bloků kódu se nemění.
 */
const DELIMITER_ROW = /^\s*\|?\s*:?[-–—−]+:?\s*(\|\s*:?[-–—−]+:?\s*)*\|?\s*$/;
const FANCY_DASH = /[–—−]/;
const FENCE = /^\s{0,3}(```+|~~~+)/;

export function normalizeMarkdown(source: string): string {
  const lines = source.split('\n');
  let fence: string | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = FENCE.exec(line);
    if (m) {
      const marker = m[1][0];
      if (!fence) {
        fence = marker;
      } else if (fence === marker) {
        fence = undefined;
      }
      continue;
    }
    if (fence) {
      continue;
    }
    // Oddělovač musí obsahovat pipe a aspoň jednu typografickou pomlčku.
    if (line.includes('|') && FANCY_DASH.test(line) && DELIMITER_ROW.test(line)) {
      lines[i] = line.replace(/[-–—−]+/g, '---');
    }
  }
  return lines.join('\n');
}
