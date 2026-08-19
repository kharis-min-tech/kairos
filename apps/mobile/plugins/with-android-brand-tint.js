/**
 * Expo config plugin: brand-tints the Android app.
 *
 * Adds a `colorAccent` (and `colorPrimary` for consistency) to the app's
 * AppTheme in `android/app/src/main/res/values/styles.xml`. This is what
 * @react-native-community/datetimepicker (and other native Android widgets
 * with a Material tint slot) reads to draw the selected date/time, buttons,
 * and highlight the highlighted picker element.
 *
 * iOS uses a different mechanism — the `accentColor` prop on the picker
 * component itself. That's set inside DatePicker.tsx / TimePicker.tsx.
 *
 * Usage in app.config.ts:
 *   plugins: [['./plugins/with-android-brand-tint', { color: '#5D3FD3' }]]
 */
const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAndroidBrandTint(config, props) {
  const color = (props && props.color) || '#5D3FD3';

  return withAndroidStyles(config, (mod) => {
    const styles = mod.modResults;

    // AppTheme is the theme applied to the launcher/root activity by Expo.
    const setItem = (name, value) => {
      AndroidConfig.Styles.assignStylesValue(styles, {
        add: true,
        parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
        name,
        value,
      });
    };

    setItem('colorAccent', color);
    setItem('colorPrimary', color);
    setItem('colorControlActivated', color);

    return mod;
  });
};
