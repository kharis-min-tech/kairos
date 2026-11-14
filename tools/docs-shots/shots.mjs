/**
 * Every screenshot the handbook uses, and where it comes from.
 *
 * The English screenshots were taken by hand, which is why their names are
 * inconsistent: some pairs are `x.png` / `x-dark.png`, others `x-light.png` /
 * `x.png`, and `regions` pairs with `regions-black`. Those names are already
 * referenced from 42 pages in four languages, so this table maps each name to
 * what produces it rather than renaming anything.
 *
 * `prep` runs after the route has loaded and before the shutter.
 */

/**
 * The map lives on the fellowships page behind a toggle, not on a route of
 * its own: `/fellowships/map` renders a bare full-screen map whose tiles did
 * not arrive in a headless capture, and the English screenshots were plainly
 * taken from the toggled panel, which shows the legend, the search boxes and
 * the fellowship cards underneath.
 */
async function showMap(page) {
  const toggle = page.locator('button:has(svg path[d^="M9 6.75V15"])').first();
  await toggle.click().catch(() => {});
  await page.waitForSelector('canvas.mapboxgl-canvas', { timeout: 30000 }).catch(() => {});
  // Software WebGL draws tiles slowly, and a short wait captured an empty blue
  // ocean with no land on it. Wait for tile traffic to stop rather than
  // guessing: Mapbox requests keep arriving until the view is complete.
  await page.waitForResponse((r) => r.url().includes('mapbox'), { timeout: 20000 }).catch(() => {});
  let quiet = 0;
  let seen = 0;
  const tally = () => { seen++; };
  page.on('response', tally);
  for (let i = 0; i < 40 && quiet < 6; i++) {
    const before = seen;
    await page.waitForTimeout(500);
    quiet = seen === before ? quiet + 1 : 0;
  }
  page.off('response', tally);
  await page.waitForTimeout(1500);
}

/** The postcode search, so the nearest-fellowship panel is open over the map. */
async function nearestFellowship(page) {
  await showMap(page);
  const box = page.locator('input[class*="uppercase"]').first();
  await box.click();
  await box.fill('SE1 7PB');
  await box.press('Enter');
  // Geocoding plus four travel-time lookups; the panel is the slowest thing
  // the handbook screenshots.
  await page.waitForTimeout(9000);
}

/** The map panel alone, cropped the way the English pair was. */
function mapPanel(page) {
  return page.locator('div.h-\\[500px\\]').first();
}

export const SHOTS = [
  // name                        route                     theme    anonymous?
  { file: 'login',               route: '/login',          theme: 'light', anon: true },
  { file: 'login-dark',          route: '/login',          theme: 'dark',  anon: true },

  { file: 'dashboard',           route: '/dashboard',      theme: 'light' },
  { file: 'dashboard-dark',      route: '/dashboard',      theme: 'dark' },

  { file: 'members',             route: '/members',        theme: 'light' },
  { file: 'members-dark',        route: '/members',        theme: 'dark' },

  { file: 'branches',            route: '/admin/branches', theme: 'light' },
  { file: 'branches-dark',       route: '/admin/branches', theme: 'dark' },

  { file: 'regions',             route: '/admin/regions',  theme: 'light' },
  { file: 'regions-black',       route: '/admin/regions',  theme: 'dark' },

  { file: 'my-branch',           route: '/my-branch',      theme: 'light' },
  { file: 'my-branch-dark',      route: '/my-branch',      theme: 'dark' },

  { file: 'fellowships',         route: '/fellowships',    theme: 'light' },
  { file: 'fellowship-dark',     route: '/fellowships',    theme: 'dark' },

  { file: 'fellowships-map-light', route: '/fellowships', theme: 'light', prep: showMap },
  { file: 'fellowships-map-dark',  route: '/fellowships', theme: 'dark',  prep: showMap },

  { file: 'nearest-fellowship-light', route: '/fellowships', theme: 'light', prep: nearestFellowship, clip: mapPanel },
  { file: 'nearest-fellowship-dark',  route: '/fellowships', theme: 'dark',  prep: nearestFellowship, clip: mapPanel },

  // The fellowship creation form appears on two pages under two names.
  { file: 'creating-a-fellowship',      route: '/fellowships/new', theme: 'light' },
  { file: 'creating-a-fellowship-dark', route: '/fellowships/new', theme: 'dark' },
  { file: 'set-up-fellowship-light',    route: '/fellowships/new', theme: 'light' },
  { file: 'set-up-fellowship',          route: '/fellowships/new', theme: 'dark' },

  { file: 'departments',         route: '/departments',    theme: 'light' },
  { file: 'departments-dark',    route: '/departments',    theme: 'dark' },

  { file: 'set-up-department-light', route: '/departments/new', theme: 'light' },
  { file: 'set-up-department',       route: '/departments/new', theme: 'dark' },

  { file: 'attendance',          route: '/attendance',     theme: 'light' },
  { file: 'attendance-dark',     route: '/attendance',     theme: 'dark' },

  { file: 'my-attendance',       route: '/me/attendance',  theme: 'light' },
  { file: 'my-attendance-dark',  route: '/me/attendance',  theme: 'dark' },

  { file: 'new-believers',       route: '/new-believers',  theme: 'light' },
  { file: 'new-believers-dark',  route: '/new-believers',  theme: 'dark' },

  { file: 'souls-pipeline',      route: '/souls',          theme: 'light' },
  { file: 'souls-pipeline-dark', route: '/souls',          theme: 'dark' },

  { file: 'souls-dashboard-light', route: '/souls-dashboard', theme: 'light' },
  { file: 'souls-dashboard',       route: '/souls-dashboard', theme: 'dark' },

  { file: 'outreach',            route: '/outreach/programs', theme: 'light' },
  { file: 'outreach-dark',       route: '/outreach/programs', theme: 'dark' },

  { file: 'forms',               route: '/forms',          theme: 'light' },
  { file: 'forms-dark',          route: '/forms',          theme: 'dark' },

  { file: 'form-submission',      route: '/forms/submissions', theme: 'light' },
  { file: 'form-submission-dark', route: '/forms/submissions', theme: 'dark' },

  { file: 'reports',             route: '/reports',        theme: 'light' },
  { file: 'reports-dark',        route: '/reports',        theme: 'dark' },

  { file: 'profile',             route: '/profile',        theme: 'light' },
  { file: 'profile-dark',        route: '/profile',        theme: 'dark' },

  { file: 'settings',            route: '/profile/settings', theme: 'light' },
  { file: 'settings-dark',       route: '/profile/settings', theme: 'dark' },
];
