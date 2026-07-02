import { db, schema } from '@/lib/db';
import { extractUploadedFile } from '@/lib/parsers/file';
import { splitResume } from '@/lib/ai/splitResume';
import { rowToEntry } from '@/lib/db/mappers';

// Upload a résumé/CV/document → AI splits it into multiple structured entries → created in DB.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new Response('Expected multipart form data', { status: 400 });

  const file = form.get('file');
  const textField = form.get('text');
  let text = '';
  try {
    if (file instanceof File && file.size > 0) {
      text = await extractUploadedFile(file);
    } else if (typeof textField === 'string' && textField.trim()) {
      text = textField;
    } else {
      return new Response('Provide a file or text', { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Failed to read file: ${message}`, { status: 400 });
  }
  if (!text.trim()) return new Response('No text could be extracted', { status: 400 });

  let structured;
  try {
    structured = await splitResume(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Import failed: ${message}`, { status: 500 });
  }
  if (structured.length === 0) {
    return new Response('No entries could be extracted from this document', { status: 422 });
  }

  const now = Date.now();
  const rows = structured.map((s, i) => ({
    id: crypto.randomUUID(),
    title: s.title,
    type: s.type,
    organization: s.organization,
    dateFrom: s.dateFrom,
    dateTo: s.dateTo,
    rawNotes: '',
    refinedNarrative: s.refinedNarrative,
    keyHighlights: JSON.stringify(s.keyHighlights),
    tags: JSON.stringify(s.tags),
    createdAt: now,
    // Keep document order when listed by updatedAt DESC (first entry on top).
    updatedAt: now + (structured.length - i),
  }));
  for (const r of rows) db.insert(schema.entries).values(r).run();

  return Response.json(rows.map(rowToEntry), { status: 201 });
}
