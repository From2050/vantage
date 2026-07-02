import { extractPdfText } from './file';

// Extract clean JD text from a PDF buffer or a pasted string, stripping the most
// common boilerplate so downstream AI calls focus on the actual role.
export async function extractJD(input: Buffer | string): Promise<string> {
  const text = typeof input === 'string' ? input : await extractPdfText(input);
  return stripBoilerplate(text);
}

function stripBoilerplate(raw: string): string {
  // Normalize whitespace first.
  const text = raw.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n');
  const lines = text.split('\n');
  const kept: string[] = [];

  // Standalone boilerplate sentences/lines (EEO etc.). Only applied to SHORT lines
  // so we never delete a long content paragraph that merely mentions one of these.
  const dropLine =
    /\b(equal opportunity|EEO|e-verify|affirmative action|reasonable accommodation|without regard to (race|sex|religion)|protected veteran|disability status|drug[- ]free workplace)\b/i;

  // Section headers that begin a block to drop until the next blank line / heading.
  const dropSectionStart =
    /^\s*(benefits|perks|what we offer|our benefits|compensation and benefits|equal employment|equal opportunity)\b\s*:?\s*$/i;

  let skipping = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (dropSectionStart.test(trimmed)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      // A blank line or a new heading-like line ends the skipped section.
      if (trimmed === '' || /^[A-Z][A-Za-z ]{2,40}:?$/.test(trimmed)) {
        skipping = false;
        if (trimmed === '') continue;
      } else {
        continue;
      }
    }
    // Only drop a line as boilerplate if it's a short standalone statement.
    if (trimmed.length <= 160 && dropLine.test(trimmed)) continue;
    kept.push(line);
  }

  const result = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // Safety net: if stripping nuked most of the content, keep the original.
  if (result.length < Math.max(40, text.trim().length * 0.3)) return text.trim();
  return result;
}
