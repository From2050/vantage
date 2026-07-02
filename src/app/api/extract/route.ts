import { extractUploadedFile } from '@/lib/parsers/file';

// Generic file → text extraction (PDF or text). Used to fill raw notes from an uploaded doc.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new Response('Expected multipart form data', { status: 400 });
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return new Response('No file provided', { status: 400 });
  }
  try {
    const text = await extractUploadedFile(file);
    if (!text.trim()) return new Response('No text could be extracted from the file', { status: 400 });
    return Response.json({ text, filename: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Failed to read file: ${message}`, { status: 400 });
  }
}
