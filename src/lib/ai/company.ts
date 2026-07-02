import { getProvider } from './provider';

export interface CompanySource {
  title: string;
  uri: string;
}
export interface CompanyResearch {
  text: string;
  sources: CompanySource[];
}

// Research a company/role with live web search. Provider-optional: when the active
// provider can't search the web (e.g. a local model), we throw a clear error and
// the UI degrades to the manual company-info field.
export async function researchCompany(company: string, role?: string): Promise<CompanyResearch> {
  const provider = getProvider();
  if (!provider.capabilities.webSearch) {
    throw new Error(
      `The current AI provider (${provider.name}) cannot search the web — fill in company info manually instead.`,
    );
  }

  const prompt = `Research the company "${company}"${role ? ` in the context of the role "${role}"` : ''} using current web information.

Write 4–6 sentences a job applicant would find useful: what the company does, its products/market, its size or stage, its culture or values if available, and anything notable about the team or role. Be factual and specific. If you cannot find reliable information, say so briefly rather than guessing.`;

  return provider.webSearch(prompt);
}
