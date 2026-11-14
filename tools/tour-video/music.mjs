#!/usr/bin/env node
/**
 * Mix the music bed under the finished clips.
 *
 *   node music.mjs                 every clip in out/
 *   node music.mjs --only admin    one of them
 *   node music.mjs --dry           say what would happen
 *
 * ## Why this is a separate step
 *
 * The bed could be an <Audio> in the Remotion composition, and was briefly.
 * But a music level is something you have to hear before you can judge, and
 * baking it into the render means every judgement costs a full re-render of
 * all 144 clips -- three and a half hours to find out a track is 2dB loud.
 * Mixed afterwards, the video stream is copied untouched and only the audio
 * is rebuilt: the whole set takes a few minutes, and the picture is bit for
 * bit what Remotion produced.
 *
 * ## How it ducks
 *
 * `sidechaincompress`, keyed off the narration itself rather than off the
 * schedule's idea of where the narration is. The voice track opens the
 * compressor, so the bed gets out of the way of the actual waveform --
 * including the breaths and tails that no list of timings knows about. Fast
 * attack so it is never caught loud under a first syllable, slow release so
 * it comes back without pumping between sentences.
 *
 * Originals stay in out/ and the mixes are written to mixed/, so re-running
 * with a different bed can never mix twice over the same clip.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const MIXED = join(HERE, 'mixed');
const BED = join(HERE, 'assets', 'bed.mp3');

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? null : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);

const only = arg('only');
const dry = has('dry');

// Level and shape. Tweak here, re-run, listen -- it costs minutes.
//
// BED_UNDER is a *relative* figure, and deliberately so. A fixed linear gain
// assumes the supplied track is mastered at some typical level, and the
// first one tried here was 12dB quieter than that -- the mix came out
// bit-identical to the input, because the bed had been pushed to -48dB and
// was simply inaudible. Measuring both sides and computing the difference
// means any track lands in the same place, however hot or quiet it is.
const BED_UNDER = 18; // dB below the narration of the clip it goes under
const THRESHOLD = 0.02; // how much voice it takes to start ducking
const RATIO = 8; // how hard it ducks once it does
const ATTACK = 20; // ms -- ahead of the syllable
const RELEASE = 400; // ms -- back up without pumping
const FADE_IN = 1.5;
const FADE_OUT = 2;

if (!existsSync(BED)) {
  console.log('no assets/bed.mp3 - nothing to mix.');
  console.log('Drop a licensed instrumental there and run this again;');
  console.log('see assets/README.md for what makes a good one.');
  process.exit(0);
}

mkdirSync(MIXED, { recursive: true });

const clips = readdirSync(OUT)
  .filter((f) => f.endsWith('.mp4'))
  .filter((f) => !only || f.includes(only))
  .sort();

if (!clips.length) {
  console.error(`no clips in ${OUT}`);
  process.exit(1);
}

const seconds = (file) =>
  parseFloat(
    execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ]).toString().trim(),
  );

/** True when the file has an audio stream at all. */
const hasAudio = (file) =>
  execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index',
    '-of', 'csv=p=0', file,
  ]).toString().trim().length > 0;

/**
 * Mean level of a file's audio, in dBFS.
 *
 * spawnSync rather than execFileSync because volumedetect reports on stderr,
 * and execFileSync hands back stdout -- which is empty, so the first version
 * of this threw on `null.toString()`.
 */
const meanDb = (file) => {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const m = `${r.stderr}`.match(/mean_volume:\s*(-?[\d.]+) dB/);
  if (!m) throw new Error(`could not measure ${file}`);
  return parseFloat(m[1]);
};

const bedDb = meanDb(BED);
console.log(`bed measures ${bedDb.toFixed(1)} dB mean; placing it ${BED_UNDER} dB under each clip\n`);

let done = 0;
let skipped = 0;

for (const name of clips) {
  const src = join(OUT, name);
  const dest = join(MIXED, name);

  // Already mixed and newer than both inputs? Leave it.
  if (
    existsSync(dest) &&
    statSync(dest).mtimeMs > statSync(src).mtimeMs &&
    statSync(dest).mtimeMs > statSync(BED).mtimeMs
  ) {
    skipped++;
    continue;
  }

  const dur = seconds(src);
  const fadeOutAt = Math.max(0, dur - FADE_OUT);

  if (!hasAudio(src)) {
    console.log(`${name.padEnd(52)} no voice track - skipped`);
    skipped++;
    continue;
  }

  // Put this bed this far under this clip's narration, whatever either of
  // them happens to be mastered at.
  const gainDb = meanDb(src) - BED_UNDER - bedDb;

  const filter = [
    // The bed: looped by -stream_loop, trimmed to the clip, shaped.
    `[1:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,`,
    `volume=${gainDb.toFixed(2)}dB,`,
    `afade=t=in:st=0:d=${FADE_IN},`,
    `afade=t=out:st=${fadeOutAt.toFixed(3)}:d=${FADE_OUT}[bed];`,
    // The voice, twice: once to hear, once to key the compressor.
    `[0:a]asplit=2[voice][key];`,
    `[bed][key]sidechaincompress=threshold=${THRESHOLD}:ratio=${RATIO}:`,
    `attack=${ATTACK}:release=${RELEASE}[ducked];`,
    `[voice][ducked]amix=inputs=2:duration=first:normalize=0[mix]`,
  ].join('');

  if (dry) {
    console.log(`${name.padEnd(52)} would mix (${dur.toFixed(1)}s, bed ${gainDb.toFixed(1)}dB)`);
    done++;
    continue;
  }

  try {
    execFileSync(
      'ffmpeg',
      [
        '-v', 'error', '-y',
        '-i', src,
        '-stream_loop', '-1', '-i', BED,
        '-filter_complex', filter,
        '-map', '0:v', '-map', '[mix]',
        // The picture is never touched: no second generation of h264.
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-shortest',
        dest,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    console.log(`${name.padEnd(52)} mixed  ${dur.toFixed(1)}s  bed ${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)}dB`);
    done++;
  } catch (err) {
    console.error(`${name.padEnd(52)} FAILED`);
    console.error(err.stderr?.toString().split('\n').slice(0, 3).join('\n'));
  }
}

console.log(`\n${done} mixed, ${skipped} already current, in mixed/`);
