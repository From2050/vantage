import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToJDSession } from '@/lib/db/mappers';
import { extractJD } from '@/lib/parsers/jd';
import { generateDigest } from '@/lib/ai/digest';

export async function GET() {
  const rows = db
    .select()
    .from(schema.jdSessions)
    .orderBy(desc(schema.jdSessions.createdAt))
    .all();
  return Response.json(rows.map(rowToJDSession));
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new Response('Expected multipart form data', { status: 400 });

  const file = form.get('file');
  const pastedText = form.get('text');
  let rawContent = '';
  let filename = '';

  try {
    if (file instanceof File && file.size > 0) {
      filename = file.name || 'Uploaded JD';
      const buf = Buffer.from(await file.arrayBuffer());
      rawContent = await extractJD(buf);
    } else if (typeof pastedText === 'string' && pastedText.trim()) {
      const fn = form.get('filename');
      filename = typeof fn === 'string' && fn.trim() ? fn : 'Pasted JD';
      rawContent = await extractJD(pastedText);
    } else {
      return new Response('Provide a PDF file or pasted text', { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Failed to read JD: ${message}`, { status: 400 });
  }

  if (!rawContent.trim()) {
    return new Response('No text could be extracted from the JD', { status: 400 });
  }

  let digest;
  try {
    digest = await generateDigest(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Digest failed: ${message}`, { status: 500 });
  }

  const row = {
    id: crypto.randomUUID(),
    filename,
    rawContent,
    digest: JSON.stringify(digest),
    createdAt: Date.now(),
  };
  db.insert(schema.jdSessions).values(row).run();
  return Response.json(rowToJDSession(row), { status: 201 });
}
