import { researchCompany } from '@/lib/ai/company';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : undefined;
  if (!company) return new Response('company is required', { status: 400 });

  try {
    const result = await researchCompany(company, role);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Research failed: ${message}`, { status: 500 });
  }
}
