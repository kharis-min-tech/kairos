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

/**
 * The demo accounts, chosen so each tour shows what that person really sees.
 *
 * Kairos has no "select your role" step — the sidebar is built from the
 * grants on the account — so the only honest way to record a member's view
 * is to sign in as a member.
 */
export const ACCOUNTS = {
  /** No grants at all: the view most of the congregation has. */
  member: { email: 'alex.johnson@kairos.local', password: 'Password1!' },
  /** Branch System Admin + Department Lead + Fellowship Leader in London. */
  pastor: { email: 'sarah.williams@kairos.local', password: 'Password1!' },
  /** Every branch and region. */
  admin: { email: 'admin@kairos.local', password: 'Password1!' },
};

export async function loadFlow(id) {
  // The section clips are generated from a table rather than written out one
  // file at a time, so they are looked up there before the filesystem.
  const { SECTION_FLOWS } = await import('./sections.mjs');
  if (SECTION_FLOWS[id]) return SECTION_FLOWS[id];

  const mod = await import(join(HERE, `${id}.mjs`));
  const flow = mod.default ?? mod.flow;
  if (!flow?.stops?.length) throw new Error(`flow "${id}" has no stops`);
  return flow;
}

export async function listFlows() {
  const { SECTION_FLOWS } = await import('./sections.mjs');
  const files = readdirSync(HERE)
    .filter((f) => f.endsWith('.mjs') && !['index.mjs', 'section.mjs', 'sections.mjs'].includes(f))
    .map((f) => f.replace(/\.mjs$/, ''));
  return [...files, ...Object.keys(SECTION_FLOWS)].sort();
}
