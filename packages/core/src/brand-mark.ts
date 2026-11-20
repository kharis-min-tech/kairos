/**
 * The iKharis mark, as vector.
 *
 * One monogram carrying three things at once: a dove-inspired wing, the
 * lowercase `i` of iKharis, and the uppercase `K` of Kharis. Both clients draw
 * from these constants so web and mobile are never a redraw apart.
 *
 * ── Variant B, "simplified premium" ───────────────────────────────────────
 *
 * Taken from the `iKharis Logo` Figma file's identity review, column B:
 * shorter wing projection, a unified K contour, fewer separate shapes. The
 * geometry is Figma's, untouched; only the fills were brought to Modern
 * Sanctuary. The file's own purple (#6417B8) and gold (#B17A25) are flagged
 * there as reference-derived and awaiting confirmation against the official
 * Kharis brand specification, so the app's palette stays the source of truth
 * and the mark comes to it rather than the reverse.
 *
 * ── Why this replaced the dove ────────────────────────────────────────────
 *
 * The previous mark was line art: six subpaths tracing the two edges of each
 * ribbon of a dove, which is why stroking them read as a pen drawing it. This
 * mark is solid shapes, so a stroke traces each silhouette instead. The draw
 * still works and still runs once, but it is an outline being inked rather
 * than a line being followed — a deliberate change in character, not a bug.
 */

/**
 * Square, so `size` can set width and height on every call site without
 * squashing the art.
 *
 * The artwork is 143.401 wide by 125 tall. Rather than wrap it in a transform
 * — which react-native-svg and the web would each need handling for — the
 * viewBox starts 9.2005 units ABOVE the art and is as tall as it is wide. The
 * art then sits centred in a square viewport as pure data, with no group node
 * and nothing for a consumer to get wrong.
 */
export const MARK_WIDTH = 143.401;
export const MARK_HEIGHT = 125;
export const MARK_VIEWBOX_SIZE = MARK_WIDTH;
const MARK_Y_OFFSET = (MARK_WIDTH - MARK_HEIGHT) / 2; // 9.2005
export const MARK_VIEWBOX = `0 ${-MARK_Y_OFFSET} ${MARK_WIDTH} ${MARK_WIDTH}`;

/** The gold of the `i` dot. Modern Sanctuary's accent, not Figma's #B17A25. */
export const MARK_ACCENT = '#f8b537';

export interface MarkSubpath {
  d: string;
  /**
   * Its own perimeter in viewBox units. SVG dash patterns are per-subpath, so
   * a draw animation needs each one's length to make them all finish together
   * — the web side gets this for free from `pathLength`, React Native does
   * not.
   */
  length: number;
  /**
   * `brand` inherits `currentColor`, so the mark can be purple on light, white
   * inside the gradient tile, or black in a single-colour proof without
   * knowing which. `accent` is the gold dot, and is the one part that carries
   * its own colour — callers that need a true one-colour mark (small sizes,
   * mono proofs, the reversed tile) render it in `currentColor` too.
   */
  role: 'brand' | 'accent';
}

/** Wing-and-K, the `i` stem, then the dot — back to front, so the dot lands on top. */
export const MARK_SUBPATHS: readonly MarkSubpath[] = [
  {
    role: 'brand',
    length: 633.78,
    d: 'M0 0C15.8629 10.7868 32.3604 10.7868 50.1269 13.9594C73.6041 17.7665 86.9289 24.7462 86.2944 42.5127C100.888 19.6701 123.096 17.7665 143.401 28.5533C126.269 27.2843 119.289 38.7056 110.406 53.934C101.523 69.1624 89.467 79.3147 78.0457 86.9289C98.3503 77.4112 114.213 104.061 142.132 125H113.579C97.0812 125 84.3909 105.964 73.6041 97.7157C68.5279 106.599 65.9899 115.482 64.0863 125V102.157C64.0863 85.6599 73.6041 72.335 79.9492 58.3756C88.8325 38.7056 73.6041 38.7056 52.0305 38.7056C23.4772 39.3401 7.61421 31.0914 0 0Z',
  },
  {
    role: 'brand',
    length: 145.51,
    d: 'M56.4721 71.066V125H32.3604V92.6396C32.3604 81.2183 42.5127 74.2386 56.4721 71.066Z',
  },
  {
    role: 'accent',
    length: 59.81,
    d: 'M48.2234 66.6244C53.4799 66.6244 57.7411 62.3631 57.7411 57.1066C57.7411 51.8501 53.4799 47.5888 48.2234 47.5888C42.9668 47.5888 38.7056 51.8501 38.7056 57.1066C38.7056 62.3631 42.9668 66.6244 48.2234 66.6244Z',
  },
];

/** Every subpath as one `d`, for a single filled path in one colour. */
export const MARK_PATH = MARK_SUBPATHS.map((s) => s.d).join('');

/**
 * The small-size master, for 16 and 32 px.
 *
 * Not a scaled copy. Below about 48px the primary mark loses the `i` against
 * the K and the dot turns to mud, so Figma supplies separately drawn geometry
 * on a 14-unit grid: the K's lower arm split into its own shape, the stem
 * snapped to whole pixels, the dot opened out to a true 2px circle. It is
 * single-colour by construction — there is no gold at this size, because a
 * two-pixel gold dot is an artefact rather than an accent.
 *
 * Used for the favicon. Anything 48px or over takes `MARK_SUBPATHS`.
 */
export const MARK_SMALL_WIDTH = 14;
export const MARK_SMALL_HEIGHT = 11.9839;
const MARK_SMALL_Y_OFFSET = (MARK_SMALL_WIDTH - MARK_SMALL_HEIGHT) / 2;
export const MARK_SMALL_VIEWBOX = `0 ${-MARK_SMALL_Y_OFFSET} ${MARK_SMALL_WIDTH} ${MARK_SMALL_WIDTH}`;

export const MARK_SMALL_SUBPATHS: readonly MarkSubpath[] = [
  {
    role: 'brand',
    length: 46.84,
    d: 'M0 0C1.29839 1.41129 3.21774 1.75 5.19355 2.03226C7.45161 2.37097 9.42742 2.76613 9.42742 4.96774C10.4435 3.21774 12.1371 2.25806 14 3.27419C12.3065 3.21774 11.9113 4.74194 10.8952 6.26613C10.0484 7.56452 8.69355 8.46774 7.84677 9.48387C7.33871 10.2177 7.16935 11.121 6.8871 11.9677C6.83065 10.2742 6.94355 8.97581 7.79032 7.73387C8.69355 6.43548 8.97581 5.41935 8.01613 4.74194C6.8871 3.89516 4.62903 4.45968 2.82258 3.89516C1.01613 3.33065 0.33871 2.03226 0 0Z',
  },
  {
    role: 'brand',
    length: 13.86,
    d: 'M7.56451 9.59677C8.52419 8.52419 9.48387 8.80644 10.5 9.54032C11.4597 10.2177 12.4194 11.3468 13.4355 11.9677H11.0081C9.42742 11.9677 8.80645 10.5564 7.56451 9.59677Z',
  },
  {
    role: 'brand',
    length: 11.18,
    d: 'M6 7.98387V11.9839H4V9.48387C4 8.68387 5 8.23387 6 7.98387Z',
  },
  {
    role: 'brand',
    length: 6.28,
    d: 'M5 6.98387C5.55228 6.98387 6 6.53616 6 5.98387C6 5.43159 5.55228 4.98387 5 4.98387C4.44772 4.98387 4 5.43159 4 5.98387C4 6.53616 4.44772 6.98387 5 6.98387Z',
  },
];

export const MARK_SMALL_PATH = MARK_SMALL_SUBPATHS.map((s) => s.d).join('');
