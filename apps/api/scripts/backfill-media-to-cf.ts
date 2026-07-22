/**
 * Backfill base64-encoded images stored in Postgres to Cloudflare Images.
 *
 * Reads:
 *   - members.photo_url
 *   - department_uniform_outfits.image_url
 *
 * For any row where the value starts with `data:image/...;base64,`, decodes the
 * bytes, uploads them to CF Images, and swaps the row's URL for the delivery
 * URL. HTTP-URL rows and empty rows are skipped.
 *
 * Run once against prod after the media module + shared uploader deploy. The
 * old base64 rows keep rendering meanwhile (data URIs work in <img>), so
 * running this in-place carries no downtime.
 *
 * Usage:
 *   DATABASE_URL="postgres://…" \
 *   CF_IMAGES_ACCOUNT_ID="…" \
 *   CF_IMAGES_ACCOUNT_HASH="…" \
 *   CF_IMAGES_TOKEN="…" \
 *   npx tsx apps/api/scripts/backfill-media-to-cf.ts [--dry-run]
 *
 * Delete this script once the backfill is verified in prod.
 */
import postgres from 'postgres';

const DATABASE_URL = process.env['DATABASE_URL'];
const CF_ACCOUNT_ID = process.env['CF_IMAGES_ACCOUNT_ID'];
const CF_ACCOUNT_HASH = process.env['CF_IMAGES_ACCOUNT_HASH'];
const CF_TOKEN = process.env['CF_IMAGES_TOKEN'];
const DRY_RUN = process.argv.includes('--dry-run');

if (!DATABASE_URL || !CF_ACCOUNT_ID || !CF_ACCOUNT_HASH || !CF_TOKEN) {
  console.error('Missing env: DATABASE_URL, CF_IMAGES_ACCOUNT_ID, CF_IMAGES_ACCOUNT_HASH, CF_IMAGES_TOKEN');
  process.exit(1);
}

const CF_UPLOAD_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`;

interface CfUploadResponse {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: { id: string };
}

function decodeDataUri(uri: string): { blob: Blob; mime: string } | null {
  const match = uri.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
  if (!match) return null;
  const mime = match[1]!;
  const b64 = match[2]!;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function uploadOne(blob: Blob, purpose: string, memberId: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'backfill.jpg');
  form.append('metadata', JSON.stringify({ purpose, memberId, backfilledAt: new Date().toISOString() }));
  form.append('requireSignedURLs', 'false');

  const res = await fetch(CF_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}` },
    body: form,
  });
  const body = (await res.json()) as CfUploadResponse;
  if (!res.ok || !body.success || !body.result) {
    throw new Error(`CF upload failed: ${JSON.stringify(body.errors)}`);
  }
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${body.result.id}/public`;
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 4 });

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE (will UPDATE rows)'}`);

  // ── Members ──
  const memberRows = await sql<{ id: string; photo_url: string }[]>`
    SELECT id, photo_url
    FROM members
    WHERE photo_url IS NOT NULL AND photo_url LIKE 'data:image%'
  `;
  console.log(`members: ${memberRows.length} rows with base64 photo`);
  let memberOk = 0;
  let memberSkipped = 0;
  let memberFailed = 0;
  for (const [i, row] of memberRows.entries()) {
    try {
      const decoded = decodeDataUri(row.photo_url);
      if (!decoded) {
        memberSkipped++;
        continue;
      }
      if (DRY_RUN) {
        memberOk++;
      } else {
        const url = await uploadOne(decoded.blob, 'profile-photo', row.id);
        await sql`UPDATE members SET photo_url = ${url}, updated_at = NOW() WHERE id = ${row.id}`;
        memberOk++;
      }
      if ((i + 1) % 25 === 0) console.log(`  members: ${i + 1}/${memberRows.length}`);
    } catch (err) {
      memberFailed++;
      console.error(`  member ${row.id} FAILED:`, err instanceof Error ? err.message : String(err));
    }
  }
  console.log(`members done: ok=${memberOk} skipped=${memberSkipped} failed=${memberFailed}`);

  // ── Uniform outfits ──
  const outfitRows = await sql<{ id: string; image_url: string; uploaded_by_id: string | null }[]>`
    SELECT id, image_url, uploaded_by_id
    FROM department_uniform_outfits
    WHERE image_url LIKE 'data:image%'
  `;
  console.log(`department_uniform_outfits: ${outfitRows.length} rows with base64 image`);
  let outfitOk = 0;
  let outfitSkipped = 0;
  let outfitFailed = 0;
  for (const [i, row] of outfitRows.entries()) {
    try {
      const decoded = decodeDataUri(row.image_url);
      if (!decoded) {
        outfitSkipped++;
        continue;
      }
      const memberId = row.uploaded_by_id ?? 'backfill';
      if (DRY_RUN) {
        outfitOk++;
      } else {
        const url = await uploadOne(decoded.blob, 'uniform-outfit', memberId);
        await sql`UPDATE department_uniform_outfits SET image_url = ${url}, updated_at = NOW() WHERE id = ${row.id}`;
        outfitOk++;
      }
      if ((i + 1) % 25 === 0) console.log(`  outfits: ${i + 1}/${outfitRows.length}`);
    } catch (err) {
      outfitFailed++;
      console.error(`  outfit ${row.id} FAILED:`, err instanceof Error ? err.message : String(err));
    }
  }
  console.log(`outfits done: ok=${outfitOk} skipped=${outfitSkipped} failed=${outfitFailed}`);

  await sql.end();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
