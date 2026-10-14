'use client';

import { useTranslation } from 'react-i18next';

/**
 * Shown at the top of every legal document when the reader is not on English.
 *
 * The translations exist so members can actually understand what they are
 * agreeing to, which matters more here than anywhere else in the product. But
 * they were not produced by a legal translator, and a mistranslated clause in
 * a document that governs safeguarding and data protection is a real problem.
 * So the English text stays authoritative and the page says so, which is the
 * ordinary convention for a multilingual policy rather than a hedge.
 *
 * Renders nothing on English, where there is nothing to disclaim.
 */
export function TranslationNotice() {
  const { t, i18n } = useTranslation(['legal', 'common']);
  if (i18n.language === 'en') return null;

  return (
    <aside
      // The notice itself is about English, so a screen reader should read the
      // link text in English rather than mispronouncing it in the page voice.
      className="rounded-lg border border-[#5D3FD3]/30 bg-[#5D3FD3]/5 p-4 text-xs leading-relaxed text-foreground"
    >
      <p className="font-semibold">{t('legal:translationNoticeTitle')}</p>
      <p className="mt-1">{t('legal:translationNoticeBody')}</p>
    </aside>
  );
}
