/**
 * Expo config plugin: brand-tints the Android app in both light and dark
 * modes.
 *
 * The stock @react-native-community/datetimepicker reads `colorAccent` /
 * `colorControlActivated` from the app theme to highlight the selected date,
 * OK button, and other Material widget affordances. In dark mode the picker
 * background is deep grey and the primary Modern Sanctuary purple (`#5D3FD3`)
 * reads as low-contrast; we override in values-night to a brighter tint
 * (`#a488ff`, which is `primaryLight` in the ui-native tokens).
 *
 * iOS uses the `accentColor` prop on the picker component itself — that's
 * wired in DatePicker.tsx / TimePicker.tsx and switches on the theme scheme.
 *
 * Usage in app.config.ts:
 *   plugins: [['./plugins/with-android-brand-tint', {
 *     color: '#5D3FD3',
 *     colorNight: '#a488ff'
 *   }]]
 *
 * Implementation note: an earlier version tried to use
 * `AndroidConfig.Styles.assignStylesValue` with a hardcoded `parent` matcher,
 * which added a second <style name="AppTheme"> block whenever Expo's generated
 * parent didn't match. Gradle rejected the duplicate with "Found item
 * Style/AppTheme more than one time". This version finds AppTheme by name
 * only and mutates its items in place, and writes values-night/styles.xml
 * via withDangerousMod (there's no first-party `withAndroidStylesNight`).
 */
const { withAndroidStyles, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

function patchAppTheme(styles, items) {
  if (!styles || !styles.resources) return styles;
  const styleList = styles.resources.style;
  if (!Array.isArray(styleList)) return styles;
  const appTheme = styleList.find((s) => s && s.$ && s.$.name === 'AppTheme');
  if (!appTheme) return styles;
  if (!Array.isArray(appTheme.item)) appTheme.item = [];
  for (const [name, value] of Object.entries(items)) {
    const existing = appTheme.item.find((it) => it && it.$ && it.$.name === name);
    if (existing) existing._ = value;
    else appTheme.item.push({ $: { name }, _: value });
  }
  return styles;
}

module.exports = function withAndroidBrandTint(config, props) {
  const color = (props && props.color) || '#5D3FD3';
  const colorNight = (props && props.colorNight) || color;

  // values/styles.xml — light mode + fallback
  config = withAndroidStyles(config, (mod) => {
    mod.modResults = patchAppTheme(mod.modResults, {
      colorAccent: color,
      colorPrimary: color,
      colorControlActivated: color,
    });
    return mod;
  });

  // values-night/styles.xml — dark mode override with the brighter tint.
  // No first-party withAndroidStylesNight, so shell out to withDangerousMod
  // and either patch an existing AppTheme or scaffold a fresh values-night
  // file with only the accent overrides (inheriting everything else from
  // values/styles.xml is the default Android behavior).
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const nightDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/values-night',
      );
      fs.mkdirSync(nightDir, { recursive: true });
      const nightPath = path.join(nightDir, 'styles.xml');

      const nightXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="colorAccent">${colorNight}</item>
    <item name="colorPrimary">${colorNight}</item>
    <item name="colorControlActivated">${colorNight}</item>
  </style>
</resources>
`;
      fs.writeFileSync(nightPath, nightXml, 'utf8');
      return cfg;
    },
  ]);

  return config;
};
