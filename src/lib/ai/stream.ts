// Turn a provider text-delta stream into an HTTP Response emitting plain UTF-8
// chunks. The client reads them with response.body.getReader() + TextDecoder and
// appends incrementally — see readTextStream() in src/lib/ai/readStream.ts.
export function textStreamToResponse(stream: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of stream) {
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        controller.enqueue(encoder.encode(`\n\n[stream error: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
