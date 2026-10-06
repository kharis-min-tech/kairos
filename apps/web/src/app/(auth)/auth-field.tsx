'use client';

import { useEffect, useState } from 'react';
import { resolveDaypart, type Daypart } from '@kairos/core';

/**
 * The field behind the auth shell, lit for the time of day.
 *
 * The hour that matters is the viewer's, not the server's — this renders on
 * Cloudflare, which is UTC, and a branch in another timezone would get the
 * wrong light. So the server paints `day` and the real value lands on
 * hydration; globals.css transitions the three tints over 1.4s, so the field
 * settles into the hour rather than snapping to it.
 */
export function AuthField() {
  const [daypart, setDaypart] = useState<Daypart>('day');

  useEffect(() => setDaypart(resolveDaypart(new Date().getHours())), []);

  return (
    <div
      aria-hidden
      data-daypart={daypart}
      className="auth-field-root pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="auth-field auth-blob-1" />
      <div className="auth-field auth-blob-2" />
      <div className="auth-field auth-blob-3" />
    </div>
  );
}
