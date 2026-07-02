export interface OrganizeParsed {
  refinedNarrative: string;
  keyHighlights: string[];
  tags: string[];
  questions: string[];
}

// Parse the Organizer's free-text output into structured fields. Tolerant of
// minor formatting drift; the user can also edit the text before accepting.
export function parseOrganizeOutput(text: string): OrganizeParsed {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const idx = (re: RegExp) => lines.findIndex((l) => re.test(l.trim()));
  const highlightsAt = idx(/^key highlights:?$/i);
  const tagsAt = idx(/^suggested tags:/i);
  const questionsAt = idx(/^questions:?$/i);

  // Narrative = everything before the first recognized section header.
  const headerPositions = [highlightsAt, tagsAt, questionsAt].filter((n) => n >= 0);
  const narrativeEnd = headerPositions.length ? Math.min(...headerPositions) : lines.length;
  const refinedNarrative = lines.slice(0, narrativeEnd).join('\n').trim();

  const bulletsBetween = (start: number, end: number): string[] => {
    if (start < 0) return [];
    return lines
      .slice(start + 1, end < 0 ? undefined : end)
      .map((l) => l.trim())
      .filter((l) => /^[-*•]\s+/.test(l))
      .map((l) => l.replace(/^[-*•]\s+/, '').trim())
      .filter(Boolean);
  };

  const nextHeaderAfter = (pos: number) => {
    const after = headerPositions.filter((n) => n > pos);
    return after.length ? Math.min(...after) : -1;
  };

  const keyHighlights = bulletsBetween(highlightsAt, nextHeaderAfter(highlightsAt));

  let tags: string[] = [];
  if (tagsAt >= 0) {
    const tagLine = lines[tagsAt].replace(/^suggested tags:/i, '');
    tags = tagLine
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const questions = bulletsBetween(questionsAt, nextHeaderAfter(questionsAt));

  return { refinedNarrative, keyHighlights, tags, questions };
}
