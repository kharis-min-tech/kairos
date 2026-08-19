/**
 * Expo config plugin: brand-tints the Android app.
 *
 * Adds `colorAccent`, `colorPrimary`, and `colorControlActivated` items to
 * the existing `AppTheme` style in `android/app/src/main/res/values/styles.xml`.
 * That's what @react-native-community/datetimepicker (and other native Android
 * widgets with a Material tint slot) reads to draw the selected date/time,
 * OK/Cancel buttons, and highlight the picker's active element.
 *
 * iOS uses a different mechanism — the `accentColor` prop on the picker
 * component itself. That's set inside DatePicker.tsx / TimePicker.tsx.
 *
 * Usage in app.config.ts:
 *   plugins: [['./plugins/with-android-brand-tint', { color: '#5D3FD3' }]]
 *
 * Implementation note: an earlier version used `AndroidConfig.Styles.assignStylesValue`
 * with a hardcoded `parent` matcher, which added a second <style name="AppTheme">
 * block whenever Expo's generated parent didn't match — Gradle rejects duplicate
 * style names ("Found item Style/AppTheme more than one time"). This version
 * finds the existing AppTheme entry by name only and mutates its items in place,
 * so it works regardless of whatever parent Expo generated (Light.NoActionBar,
 * DayNight.NoActionBar, etc.).
 */
const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withAndroidBrandTint(config, props) {
  const color = (props && props.color) || '#5D3FD3';

  return withAndroidStyles(config, (mod) => {
    const styles = mod.modResults;
    if (!styles || !styles.resources) return mod;

    // The xml2js shape is { resources: { style: [{ $: { name, parent }, item: [...] }] } }
    const styleList = styles.resources.style;
    if (!Array.isArray(styleList)) return mod;

    const appTheme = styleList.find(
      (s) => s && s.$ && s.$.name === 'AppTheme',
    );
    if (!appTheme) return mod;

    if (!Array.isArray(appTheme.item)) appTheme.item = [];

    const setItem = (name, value) => {
      const existing = appTheme.item.find(
        (it) => it && it.$ && it.$.name === name,
      );
      if (existing) {
        existing._ = value;
      } else {
        appTheme.item.push({ $: { name }, _: value });
      }
    };

    setItem('colorAccent', color);
    setItem('colorPrimary', color);
    setItem('colorControlActivated', color);

    return mod;
  });
};
