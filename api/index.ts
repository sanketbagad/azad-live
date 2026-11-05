// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app the local server uses.
import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server.js';

const appReady = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { app } = await appReady;
  app(req as any, res as any);
}
