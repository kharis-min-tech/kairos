/**
 * A flow describes what the recording does: which screens, in what order,
 * and what to point at on each. One flow per video.
 *
 * Keeping them as data rather than scripts means the same recorder produces
 * the long role tours and the short per-section clips, and a section clip is
 * just a flow with few stops and a cap on its length.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The demo accounts. All seeded passwords are the same. */
export const ACCOUNTS = {
  admin: { email: 'admin@kairos.local', password: 'Password1!' },
};

export async function loadFlow(id) {
  const mod = await import(join(HERE, `${id}.mjs`));
  const flow = mod.default ?? mod.flow;
  if (!flow?.stops?.length) throw new Error(`flow "${id}" has no stops`);
  return flow;
}

export function listFlows() {
  return readdirSync(HERE)
    .filter((f) => f.endsWith('.mjs') && f !== 'index.mjs')
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort();
}
