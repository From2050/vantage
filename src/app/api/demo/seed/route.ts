import { hasUserData, seedDemo } from '@/lib/demo/seed';

// Load the fictional demo profile. Refuses if the database already has entries,
// so a real user's data is never overwritten. Pass ?force=1 to override.
export async function POST(req: Request) {
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (hasUserData() && !force) {
    return new Response('Story Bank already has entries — refusing to overwrite. Use ?force=1 to replace.', {
      status: 409,
    });
  }
  const result = seedDemo();
  return Response.json({ ok: true, ...result });
}
