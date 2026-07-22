import { getProvider } from './provider';
import { contextBlock, SHARED_RULES, type PathContext } from './paths';

// Framework-grounded career calibration. Unlike the freeform Paths analyses,
// these run the person's evidence through named, time-tested career lenses,
// each attributed to its primary source:
//
//   - Value-chain positioning: the value-chain concept from Michael E. Porter,
//     "Competitive Advantage" (1985) — where does the evidence place this person
//     on their industry's value chain, and what moves change their pricing power?
//   - Ability core (knowledge – skills – strengths): the Knowledge/Skills/Abilities
//     (KSA) decomposition from occupational psychology and job analysis; the
//     "strengths" layer follows the definition of talent as recurring patterns of
//     thought, feeling, and behavior from Marcus Buckingham & Donald O. Clifton,
//     "Now, Discover Your Strengths" (2001) — here inferred from patterns that
//     repeat ACROSS entries, which self-assessment sheets cannot do.
//
// Implemented as generic frameworks (no third-party course content).
// See docs/decisions.md D14 for the validation-first rationale.

const FIDELITY_RULES = `ABSOLUTE CONSTRAINTS — never violate:
- The person is the sole authority on what they did. Never upgrade role, ownership, or impact.
- Never invent outcomes, metrics, numbers, tools, dates, or achievements not in the evidence.
- Every claim about the person must cite the skill or entry title it rests on.
- Where evidence is insufficient to place or judge something, say so explicitly — an honest "cannot tell from the evidence" beats a confident guess.`;

export function buildValueChain(ctx: PathContext, market: string) {
  const system = `You run a VALUE-CHAIN POSITIONING analysis: place this person's evidenced skills on their industry's value chain, and assess where — and how much — their position lets them capture value.

Output sections:
## The value chain you're on
Reconstruct the industry value chain their evidence actually belongs to, as 5–8 named links (e.g. research → architecture → design → implementation → validation → deployment → support — derive the REAL links from their evidence and industry, do not force this example). One line per link: what it produces and who pays for it. If their evidence spans two chains, show both briefly and say which dominates.

## Where your evidence places you
For each strong skill (Lv.3+), name the link it serves. Then characterize each occupied link honestly:
- scarce link (few people can do it; hard to substitute) vs commodity link (many can; price competition),
- rising or falling demand for that link (state your confidence; use market data if provided),
- upstream/downstream position: whose decisions constrain you, and whose work you constrain.

## Your pricing power
An honest verdict on the person's current bargaining position: which evidence supports a premium (rare link + strong proof), and which of their skills sit on commoditizing links — including links being eroded by AI tooling. No comfort language; this section exists to be true, not kind.

## Moves that change your position
2–3 concrete repositioning moves, each: which link to move toward or claim more of, WHY their existing evidence makes the move credible (name the entries that transfer), what one new piece of evidence would complete the claim, and how the move changes what they can charge. Prefer moves along the chain they are already on over chain-switching, unless their evidence genuinely straddles chains.

${FIDELITY_RULES}

${SHARED_RULES}`;

  const prompt = `${contextBlock(ctx)}${market ? `\n\nMARKET REFERENCE DATA (demand-side signal — which links buyers are paying for):\n${market}` : ''}`;
  return { system, prompt };
}

export function valueChainStream(ctx: PathContext, market: string) {
  const { system, prompt } = buildValueChain(ctx, market);
  return getProvider().generateStream({ system, prompt, maxTokens: 2800, temperature: 0.4 });
}

export function buildAbilityCore(ctx: PathContext) {
  const system = `You run an ABILITY CORE analysis: decompose this person's evidenced portfolio into three layers with different economics — knowledge (learnable, cheap to copy), skills (practiced, provable), and strengths (transferable patterns that follow the person across contexts).

Output sections:
## Knowledge
Domain and factual knowledge visible in the evidence. For each item: where it shows up, and a blunt note on how replicable it is (how fast could a motivated peer acquire it?).

## Skills
Practiced, demonstrable abilities — things they have DONE repeatedly, with the entries that prove it. Mark which are scarce vs common in their field.

## Strengths (inferred — for the person to confirm)
The most important section. A strength is a behavioral pattern that repeats ACROSS MULTIPLE entries in different contexts — that repetition is the evidence. For each (2–4 max):
- name it in plain language (e.g. "builds a tool whenever a process has friction", "moves toward the ambiguous part of the system"),
- cite the 2+ entries where the pattern appears and what it looked like in each,
- state it as a HYPOTHESIS: "the evidence suggests… — does this ring true?"
Never present a strength on one entry's evidence; if no pattern repeats, say the evidence base is too narrow to infer strengths yet and what kind of entry would reveal them.

## Structure diagnosis
What the three-layer shape says: knowledge-heavy but skill-light (learned, not practiced)? Skills strong but strengths unnamed (effective, but can't explain why — undersold in interviews)? Strengths clear but knowledge aging? One honest paragraph on the biggest structural risk and the biggest structural asset.

## How to price yourself
How to present this structure: lead conversations with strengths (they transfer and differentiate), price on scarce evidenced skills, treat knowledge as a refreshable consumable — never the headline. 2–3 concrete phrasings they could actually use, built strictly from their own evidence.

${FIDELITY_RULES}

${SHARED_RULES}`;

  return { system, prompt: contextBlock(ctx) };
}

export function abilityCoreStream(ctx: PathContext) {
  const { system, prompt } = buildAbilityCore(ctx);
  return getProvider().generateStream({ system, prompt, maxTokens: 2800, temperature: 0.4 });
}
