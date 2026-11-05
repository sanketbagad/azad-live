// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app the local server uses.
import type { IncomingMessage, ServerResponse } from 'http';

// Imported lazily so a startup failure (e.g. missing FIREBASE_SERVICE_ACCOUNT) is reported
// as a readable JSON error instead of a bare FUNCTION_INVOCATION_FAILED.
const appReady = import('../server.js').then((m) => m.createApp());
appReady.catch(() => {}); // reported per request below; don't crash the process

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app;
  try {
    ({ app } = await appReady);
  } catch (err) {
    console.error('[AZAD LIVE] Server failed to start:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Server failed to start', detail: (err as Error)?.message ?? String(err) }));
    return;
  }
  app(req as any, res as any);
}
