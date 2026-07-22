// Pluggable assessment schema. An assessment is a self-contained JSON questionnaire
// + scoring rule. The default is Holland RIASEC (riasec.json); swap in any file that
// conforms to this shape to change the instrument (see README.md). The seam is the point.

export interface AssessmentItem {
  id: string;
  /** The statement the person rates (e.g. "Build kitchen cabinets"). */
  text: string;
  /** Which dimension this item loads onto (must be one of dimensions[].id). */
  dimension: string;
}

export interface AssessmentDimension {
  id: string;
  name: string;
  description: string;
}

export interface Assessment {
  id: string;
  name: string;
  /** Primary source + provenance (e.g. Holland 1973; public-domain O*NET items). */
  source: string;
  /** Response scale, low→high (e.g. ["Strongly dislike", … , "Strongly like"]). */
  scale: string[];
  dimensions: AssessmentDimension[];
  items: AssessmentItem[];
}

export interface DimensionScore {
  id: string;
  name: string;
  /** Mean response on this dimension's items, normalized 0–1. */
  score: number;
  raw: number; // mean on the scale's index (0-based)
  itemCount: number;
}

export interface AssessmentResult {
  assessmentId: string;
  dimensions: DimensionScore[];
  /** Dimensions sorted desc; top few form the person's "code" (e.g. RIASEC "RIA"). */
  topCode: string;
}

// Pure scoring: responses maps itemId → chosen scale index (0-based). Unknown/missing
// items are skipped. Server- and client-safe.
export function scoreAssessment(
  assessment: Assessment,
  responses: Record<string, number>,
): AssessmentResult {
  const maxIndex = Math.max(1, assessment.scale.length - 1);
  const byDim = new Map<string, number[]>();
  for (const item of assessment.items) {
    const r = responses[item.id];
    if (typeof r !== 'number' || Number.isNaN(r)) continue;
    const clamped = Math.max(0, Math.min(maxIndex, r));
    const arr = byDim.get(item.dimension) ?? [];
    arr.push(clamped);
    byDim.set(item.dimension, arr);
  }

  const dimensions: DimensionScore[] = assessment.dimensions.map((d) => {
    const vals = byDim.get(d.id) ?? [];
    const raw = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { id: d.id, name: d.name, raw, score: raw / maxIndex, itemCount: vals.length };
  });

  const topCode = [...dimensions]
    .filter((d) => d.itemCount > 0)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 3)
    .map((d) => d.id.toUpperCase())
    .join('');

  return { assessmentId: assessment.id, dimensions, topCode };
}
