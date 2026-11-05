// One-time copy of data/cricket_db.json into Firestore (app_state/main), the store used on Vercel.
// Refuses to overwrite existing Firestore data unless run with --force.
//   npx tsx scripts/seed-firestore.ts [--force]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = path.resolve(import.meta.dirname, '..');
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(root, 'secrets', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
const db = getFirestore(initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id }));

const stateDoc = db.collection('app_state').doc('main');
const liveDoc = db.collection('live_state').doc('current');

const existing = await stateDoc.get();
if (existing.exists && !process.argv.includes('--force')) {
  console.log(`Firestore already has data (version ${existing.get('version')}). Nothing written. Use --force to overwrite.`);
  process.exit(0);
}

const state = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cricket_db.json'), 'utf-8'));
const data = zlib.gzipSync(Buffer.from(JSON.stringify(state), 'utf-8'));
const live = await liveDoc.get();
const version = (live.exists ? Number(live.get('version')) || 0 : 0) + 1;
const updatedAt = Date.now();

await db.runTransaction(async (tx) => {
  tx.set(stateDoc, { data, version, updatedAt });
  tx.set(liveDoc, { version, updatedAt });
});

const users = Object.values<any>(state.users || {}).map((u) => `${u.email} (${u.role})`);
console.log(`Seeded Firestore v${version}: ${Object.keys(state.teams || {}).length} teams, ${Object.keys(state.matches || {}).length} matches, users: ${users.join(', ')}`);
