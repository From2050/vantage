import { PDFParse } from 'pdf-parse';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// Extract plain text from an uploaded file (PDF or text-like). No boilerplate stripping.
export async function extractUploadedFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  if (isPdf) {
    const buf = Buffer.from(await file.arrayBuffer());
    return (await extractPdfText(buf)).trim();
  }
  // .txt, .md, .csv, or anything else readable as text
  return (await file.text()).trim();
}
