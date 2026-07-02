// Client-side reader for the plain-text streams produced by textStreamToResponse.
// Calls onChunk with the accumulated full text after each delta.
export async function readTextStream(
  res: Response,
  onChunk: (full: string) => void,
): Promise<string> {
  if (!res.body) {
    const full = await res.text();
    onChunk(full);
    return full;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  full += decoder.decode();
  onChunk(full);
  return full;
}
