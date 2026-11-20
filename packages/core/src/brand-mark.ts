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

/* ────────────────────────────────────────────────────────────────────────
 * The horizontal lockup: the mark with "haris" set beside it.
 *
 * Figma's variant-B wordmark board, `iKharis · horizontal wordmark`. The
 * lettering is outlined vector, not type — the file calls it "optically
 * spaced vector lettering" because the K–h gap is cut against the K's lower
 * arm and every pair through h–a–r–i–s is spaced by hand. Setting it in a
 * webfont instead would reflow that spacing, change shape between the two
 * apps, and flash unstyled on first paint. A logo should be geometry.
 *
 * Figma draws the board at 118 units tall. These paths are scaled by 125/118
 * and translated into the SAME coordinate space as MARK_SUBPATHS, so the
 * lockup is one flat list of paths in one viewBox — no transform node and no
 * nested svg, which react-native-svg and the web would each handle slightly
 * differently. The mark lands at 0,0 and the lettering at 150.2866, 47.1398.
 *
 * The box is 126.589 tall against the mark's 125: the `a` and `s` carry the
 * usual round-letter overshoot below the baseline, so the lockup is very
 * slightly deeper than the mark alone. That is correct and should not be
 * "fixed" by trimming — it is what keeps the curves looking level with the
 * flat-bottomed `h` and `i`.
 */
export const LOCKUP_WIDTH = 369.3544;
export const LOCKUP_HEIGHT = 126.589;
export const LOCKUP_VIEWBOX = `0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}`;
/** Width per unit of height — what a call site that sets a height needs. */
export const LOCKUP_ASPECT = LOCKUP_WIDTH / LOCKUP_HEIGHT;

export interface WordmarkLetter {
  /** Which letter, so a diff that mangles one says which. */
  letter: 'h' | 'a' | 'r' | 'i' | 's';
  d: string;
}

/**
 * The five letters of "haris", already placed.
 *
 * No `length` and no `role`, unlike MARK_SUBPATHS, and deliberately: the
 * lettering never draws and never carries the accent. Inking five letterforms
 * would stretch the brand beat into an animation, and the whole point of the
 * gold dot is that it is the one spot of accent — a gold letter would compete
 * with it. They fill in `currentColor` after the mark has drawn.
 */
export const WORDMARK_LETTERS: readonly WordmarkLetter[] = [
  {
    letter: 'h',
    d: 'M189.3756 125V97.9873C189.3756 96.6808 189.3049 95.0212 189.1637 93.0085C189.0225 90.9605 188.5811 88.9124 187.8396 86.8644C187.0981 84.8164 185.8798 83.1038 184.1849 81.7267C182.5253 80.3496 180.1595 79.661 177.0875 79.661C175.8515 79.661 174.5274 79.8552 173.115 80.2436C171.7026 80.6321 170.3785 81.3912 169.1425 82.5212C167.9066 83.6158 166.8827 85.2401 166.0705 87.3941C165.2937 89.548 164.9053 92.4082 164.9053 95.9746L156.6425 92.0551C156.6425 87.5353 157.5606 83.298 159.3968 79.3432C161.2329 75.3885 163.9871 72.1928 167.6595 69.7564C171.3671 67.3199 176.0281 66.1017 181.6425 66.1017C186.127 66.1017 189.7816 66.8609 192.6065 68.3792C195.4314 69.8976 197.6206 71.822 199.1743 74.1525C200.7633 76.4831 201.8933 78.9195 202.5642 81.4619C203.235 83.969 203.6412 86.2641 203.7824 88.3475C203.9236 90.4308 203.9942 91.9492 203.9942 92.9025V125H189.3756ZM150.2866 125V48.7288H163.1044V87.9237H164.9053V125H150.2866Z',
  },
  {
    letter: 'a',
    d: 'M227.5112 126.589C223.4151 126.589 219.937 125.8122 217.0769 124.2585C214.252 122.6695 212.0981 120.5685 210.615 117.9555C209.1672 115.3072 208.4434 112.3941 208.4434 109.2161C208.4434 106.5678 208.8494 104.149 209.6616 101.9597C210.4738 99.7704 211.7803 97.8461 213.5811 96.1864C215.4172 94.4915 217.8714 93.0791 220.9434 91.9492C223.062 91.1724 225.5867 90.4838 228.5175 89.8835C231.4484 89.2832 234.7675 88.7182 238.4752 88.1886C242.1828 87.6236 246.2612 87.0056 250.7103 86.3347L245.5197 89.1949C245.5197 85.8051 244.7075 83.3157 243.0832 81.7267C241.459 80.1377 238.74 79.3432 234.9264 79.3432C232.8078 79.3432 230.6009 79.8552 228.3057 80.8792C226.0104 81.9033 224.4039 83.7217 223.4858 86.3347L210.4561 82.2034C211.9039 77.4717 214.6227 73.6229 218.6129 70.6568C222.603 67.6907 228.0408 66.2076 234.9264 66.2076C239.9759 66.2076 244.4603 66.9844 248.3798 68.5381C252.2993 70.0918 255.2654 72.7754 257.2781 76.589C258.4084 78.7076 259.079 80.8263 259.2908 82.9449C259.5027 85.0636 259.6086 87.4293 259.6086 90.0424V125H247.0027V113.2415L248.8036 115.678C246.014 119.5268 242.995 122.3164 239.7464 124.0466C236.5331 125.7415 232.4547 126.589 227.5112 126.589ZM230.5832 115.2542C233.2315 115.2542 235.4561 114.7952 237.2569 113.8771C239.0931 112.9237 240.5408 111.8467 241.6002 110.6462C242.6948 109.4457 243.4363 108.4393 243.8247 107.6271C244.5663 106.0734 244.99 104.2726 245.0959 102.2246C245.2371 100.1412 245.3078 98.411 245.3078 97.0339L249.5451 98.0932C245.2725 98.7995 241.812 99.3997 239.1637 99.8941C236.5154 100.3531 234.3791 100.7768 232.7548 101.1653C231.1306 101.5537 229.7005 101.9774 228.4646 102.4364C227.0522 103.0014 225.9045 103.6194 225.0218 104.2903C224.1743 104.9258 223.5387 105.6321 223.115 106.4089C222.7265 107.1857 222.5324 108.0508 222.5324 109.0042C222.5324 110.3107 222.8502 111.4407 223.4858 112.3941C224.1566 113.3122 225.0924 114.0183 226.293 114.5127C227.4935 115.0071 228.9236 115.2542 230.5832 115.2542Z',
  },
  {
    letter: 'r',
    d: 'M263.2103 125V67.7966H275.9222V81.7797L274.5451 79.9788C275.2866 78.0014 276.275 76.2005 277.5112 74.5763C278.7474 72.952 280.2654 71.6102 282.0663 70.5508C283.4434 69.7034 284.9444 69.0501 286.5684 68.5911C288.1923 68.0967 289.8703 67.7966 291.6002 67.6907C293.33 67.5495 295.061 67.5847 296.7908 67.7966V81.25C295.2019 80.7556 293.3481 80.5967 291.2294 80.7733C289.1457 80.9145 287.2569 81.3912 285.562 82.2034C283.8671 82.9802 282.437 84.0219 281.2718 85.3284C280.1065 86.5996 279.2241 88.1179 278.6235 89.8835C278.0228 91.6137 277.7231 93.5734 277.7231 95.7627V125H263.2103Z',
  },
  {
    letter: 'i',
    d: 'M301.0281 59.8517V47.1398H315.4349V59.8517H301.0281ZM301.0281 125V67.7966H315.4349V125H301.0281Z',
  },
  {
    letter: 's',
    d: 'M345.4137 126.589C338.2103 126.589 332.3841 124.9647 327.9349 121.7161C323.5207 118.4322 320.8375 113.8065 319.8841 107.839L334.6086 105.6144C335.2093 108.298 336.5334 110.399 338.5811 111.9174C340.6648 113.4357 343.2951 114.1949 346.4731 114.1949C349.0864 114.1949 351.0991 113.7005 352.5112 112.7119C353.9233 111.6878 354.6298 110.2754 354.6298 108.4746C354.6298 107.3446 354.347 106.4442 353.7824 105.7733C353.2178 105.0671 351.9466 104.3785 349.9688 103.7076C348.0271 103.0368 344.99 102.1539 340.8586 101.0593C336.1976 99.8588 332.472 98.5169 329.6828 97.0339C326.8936 95.5508 324.8809 93.7853 323.6447 91.7373C322.4084 89.6539 321.7908 87.1469 321.7908 84.2161C321.7908 80.5438 322.7262 77.3658 324.5981 74.6822C326.4699 71.9632 329.1002 69.88 332.49 68.4322C335.9148 66.9492 339.9402 66.2076 344.5663 66.2076C349.0504 66.2076 353.0228 66.8962 356.4836 68.2733C359.9444 69.6504 362.7336 71.6102 364.8523 74.1525C367.0059 76.6949 368.33 79.6963 368.8247 83.1568L354.1002 85.8051C353.8533 83.6864 352.9349 82.0092 351.3459 80.7733C349.7569 79.5374 347.6033 78.8136 344.8841 78.6017C342.2358 78.4251 340.0991 78.7783 338.4752 79.661C336.8862 80.5438 336.0917 81.8149 336.0917 83.4746C336.0917 84.4632 336.4275 85.2931 337.0981 85.964C337.8046 86.6349 339.2347 87.3234 341.3883 88.0297C343.5779 88.7359 346.8968 89.6539 351.3459 90.7839C355.6892 91.9139 359.1669 93.238 361.7803 94.7564C364.4286 96.2394 366.3533 98.0403 367.5536 100.1589C368.7538 102.2423 369.3544 104.7669 369.3544 107.7331C369.3544 113.5946 367.2358 118.2026 362.9985 121.5572C358.7612 124.9118 352.9 126.589 345.4137 126.589Z',
  },
];

/** Every letter as one `d`, for a single filled path. */
export const WORDMARK_PATH = WORDMARK_LETTERS.map((l) => l.d).join('');
