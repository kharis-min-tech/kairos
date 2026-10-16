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
  lightMode: string;
  darkMode: string;
  returnToTop: string;
  menu: string;
  langMenu: string;
  terms: string;
  privacy: string;
}> = {
  en: {
    label: 'English', outline: 'On this page', prev: 'Previous', next: 'Next',
    search: 'Search', lightMode: 'Switch to light theme', darkMode: 'Switch to dark theme',
    returnToTop: 'Return to top', menu: 'Menu', langMenu: 'Change language',
    terms: 'Terms & Conditions', privacy: 'Privacy Notice',
  },
  fr: {
    label: 'Français', outline: 'Sur cette page', prev: 'Précédent', next: 'Suivant',
    search: 'Rechercher', lightMode: 'Passer au thème clair', darkMode: 'Passer au thème sombre',
    returnToTop: 'Revenir en haut', menu: 'Menu', langMenu: 'Changer de langue',
    terms: 'Conditions générales', privacy: 'Avis de confidentialité',
  },
  kri: {
    label: 'Krio', outline: 'Pan dis pej', prev: 'Bifo', next: 'Nɛks',
    search: 'Luk fɔ sɔntin', lightMode: 'Go na di layt tim', darkMode: 'Go na di dak tim',
    returnToTop: 'Go bak na tɔp', menu: 'Menyu', langMenu: 'Chenj di langwej',
    terms: 'Tam ɛn Kɔndishɔn dɛn', privacy: 'Prayvasi Notis',
  },
  tw: {
    label: 'Twi', outline: 'Saa kratafa yi so', prev: 'Deɛ Ɛdi Anim', next: 'Deɛ Ɛdi Hɔ',
    search: 'Hwehwɛ', lightMode: 'Kɔ hann tebea mu', darkMode: 'Kɔ esum tebea mu',
    returnToTop: 'San kɔ soro', menu: 'Menu', langMenu: 'Sesa kasa',
    terms: 'Nhyehyɛeɛ ne Mmara', privacy: 'Kokoamsɛm Ho Amanneɛbɔ',
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
    darkModeSwitchLabel: ui.darkMode,
    lightModeSwitchTitle: ui.lightMode,
    darkModeSwitchTitle: ui.darkMode,
    sidebarMenuLabel: ui.menu,
    returnToTopLabel: ui.returnToTop,
    langMenuLabel: ui.langMenu,
    footer: {
      message:
        'Kairos: Church Administration System by Kharis Church &middot; ' +
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
