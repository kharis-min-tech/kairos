import '@testing-library/jest-dom/vitest';

// Load the catalogues for every test. The app gets this from I18nProvider in
// the root layout; a test that renders one page on its own would otherwise see
// t() return the key path instead of the English string, so every query by
// visible text would fail.
//
// Initialised here rather than by importing '@/lib/i18n', which carries a
// 'use client' directive and reads navigator/localStorage on import.
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import kri from './locales/kri.json';
import tw from './locales/tw.json';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: { en, fr, kri, tw },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// Node 26 defines its own `localStorage` getter on globalThis, which returns
// undefined unless the process was started with --localstorage-file. Under the
// jsdom environment `window === globalThis`, so that getter shadows jsdom's
// Storage and every `localStorage.getItem` in the app throws
// "Cannot read properties of undefined". Replace it with a working in-memory
// Storage, per test file, which is what a browser would give us anyway.
class MemoryStorage implements Storage {
  #map = new Map<string, string>();
  get length() { return this.#map.size; }
  clear() { this.#map.clear(); }
  getItem(k: string) { return this.#map.has(k) ? this.#map.get(k)! : null; }
  key(i: number) { return [...this.#map.keys()][i] ?? null; }
  removeItem(k: string) { this.#map.delete(k); }
  setItem(k: string, v: string) { this.#map.set(k, String(v)); }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[name] === 'undefined') {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
