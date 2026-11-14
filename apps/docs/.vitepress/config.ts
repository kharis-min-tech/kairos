import { defineConfig } from 'vitepress';

import { navFor, sidebarFor, href, type Lang } from './nav';

/**
 * The handbook is published in the same four languages as Kairos itself, and
 * the app links straight into the reader's own: a French dashboard's "Help
 * and guides" opens `/fr/`, not the English pages with a picker to find.
 *
 * English stays at the root so every link already shared or bookmarked keeps
 * working.
 */
const UI: Record<Lang, {
  label: string;
  outline: string;
  prev: string;
  next: string;
  search: string;
  /**
   * The standing label beside the theme toggle.
   *
   * Separate from lightMode/darkMode, which are the hover titles. A title
   * names the action the control performs ("Switch to dark theme"); a label
   * names what the control is for. Using the action as the label left the
   * row reading as an instruction that contradicted itself the moment the
   * toggle was flipped.
   */
  appearance: string;
  lightMode: string;
  darkMode: string;
  returnToTop: string;
  menu: string;
  langMenu: string;
  skipToContent: string;
  footerLine: string;
  terms: string;
  privacy: string;
}> = {
  en: {
    label: 'English', outline: 'On this page', prev: 'Previous', next: 'Next',
    search: 'Search', appearance: 'Appearance', lightMode: 'Switch to light theme', darkMode: 'Switch to dark theme',
    returnToTop: 'Return to top', menu: 'Menu', langMenu: 'Change language',
    skipToContent: 'Skip to content',
    footerLine: 'Kairos: Church Administration System by Kharis Church',
    terms: 'Terms & Conditions', privacy: 'Privacy Notice',
  },
  fr: {
    label: 'Français', outline: 'Sur cette page', prev: 'Précédent', next: 'Suivant',
    search: 'Rechercher', appearance: 'Apparence', lightMode: 'Passer au thème clair', darkMode: 'Passer au thème sombre',
    returnToTop: 'Revenir en haut', menu: 'Menu', langMenu: 'Changer de langue',
    skipToContent: 'Aller au contenu',
    footerLine: 'Kairos : le système d’administration d’église de Kharis Church',
    terms: 'Conditions générales', privacy: 'Avis de confidentialité',
  },
  kri: {
    label: 'Krio', outline: 'Pan dis pej', prev: 'Bifo', next: 'Nɛks',
    search: 'Luk fɔ sɔntin', appearance: 'Aw i luk', lightMode: 'Go na di layt tim', darkMode: 'Go na di dak tim',
    returnToTop: 'Go bak na tɔp', menu: 'Menyu', langMenu: 'Chenj di langwej',
    skipToContent: 'Go stret to di kɔntɛnt',
    footerLine: 'Kairos: Chɔch Administreshɔn Sistem bay Kharis Church',
    terms: 'Tɛms ɛn Kɔndishɔn', privacy: 'Prayvesi Notis',
  },
  tw: {
    label: 'Twi', outline: 'Saa kratafa yi so', prev: 'Deɛ Ɛdi Anim', next: 'Deɛ Ɛdi Hɔ',
    search: 'Hwehwɛ', appearance: 'Tebea', lightMode: 'Kɔ hann tebea mu', darkMode: 'Kɔ esum tebea mu',
    returnToTop: 'San kɔ soro', menu: 'Menu', langMenu: 'Sesa kasa',
    skipToContent: 'Kɔ nsɛm no so tẽẽ',
    footerLine: 'Kairos: Kharis Church asɔre nhyehyɛeɛ',
    terms: 'Nhyehyɛeɛ ne Mmara', privacy: 'Kokoamsɛm Nkra',
  },
};

const DESCRIPTION: Record<Lang, string> = {
  en: 'Church Administration System: documentation for Kharis Church.',
  fr: 'Système d’administration d’église : la documentation de Kharis Church.',
  kri: 'Chɔch Adminstreshɔn Sistem: di dɔkyumɛnteshɔn fɔ Kharis Church.',
  tw: 'Asɔre Sohwɛ Nhyehyɛeɛ: Kharis Church nkyerɛkyerɛmu.',
};

const BCP47: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', kri: 'kri', tw: 'tw' };

function themeFor(lang: Lang) {
  const ui = UI[lang];
  return {
    siteTitle: 'Kairos',
    nav: navFor(lang),
    sidebar: sidebarFor(lang),
    outline: { level: [2, 3] as [number, number], label: ui.outline },
    docFooter: { prev: ui.prev, next: ui.next },
    darkModeSwitchLabel: ui.appearance,
    lightModeSwitchTitle: ui.lightMode,
    darkModeSwitchTitle: ui.darkMode,
    sidebarMenuLabel: ui.menu,
    returnToTopLabel: ui.returnToTop,
    langMenuLabel: ui.langMenu,
    skipToContentLabel: ui.skipToContent,
    footer: {
      message:
        `${ui.footerLine} &middot; ` +
        `<a href="${href(lang, 'legal/terms')}">${ui.terms}</a> &middot; ` +
        `<a href="${href(lang, 'legal/privacy')}">${ui.privacy}</a>`,
    },
  };
}

export default defineConfig({
  title: 'Kairos',
  description: DESCRIPTION.en,
  base: '/',
  ignoreDeadLinks: [/^http:\/\/localhost/],

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' }],
    ['meta', { name: 'theme-color', content: '#6D28D9', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: dark)' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
  ],

  locales: {
    root: { label: UI.en.label, lang: BCP47.en, description: DESCRIPTION.en, themeConfig: themeFor('en') },
    fr: { label: UI.fr.label, lang: BCP47.fr, link: '/fr/', description: DESCRIPTION.fr, themeConfig: themeFor('fr') },
    kri: { label: UI.kri.label, lang: BCP47.kri, link: '/kri/', description: DESCRIPTION.kri, themeConfig: themeFor('kri') },
    tw: { label: UI.tw.label, lang: BCP47.tw, link: '/tw/', description: DESCRIPTION.tw, themeConfig: themeFor('tw') },
  },

  themeConfig: {
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        locales: {
          fr: { translations: { button: { buttonText: UI.fr.search, buttonAriaLabel: UI.fr.search } } },
          kri: { translations: { button: { buttonText: UI.kri.search, buttonAriaLabel: UI.kri.search } } },
          tw: { translations: { button: { buttonText: UI.tw.search, buttonAriaLabel: UI.tw.search } } },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kharis-min-tech/kairos' },
    ],
  },
});
