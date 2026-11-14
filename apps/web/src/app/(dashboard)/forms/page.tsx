'use client';

import Link from 'next/link';
import { Card, CardContent } from '@kairos/ui';
import { useMyFormCapabilities } from '@/hooks/use-forms';
import {
  Flame,
  Droplets,
  MessageSquareQuote,
  Baby,
  HandHeart,
  UserPlus,
  ClipboardList,
  Archive,
  ChevronRight,
} from 'lucide-react';
import {
  FORM_DEFINITIONS,
  FORM_TYPES,
  localiseFormDefinition,
  type FormType,
} from '@kairos/types';
import { useTranslation } from 'react-i18next';

const FORM_ICONS: Record<FormType, React.ReactNode> = {
  first_time_visitor: <UserPlus className="h-6 w-6" />,
  altar_call: <Flame className="h-6 w-6" />,
  baptism: <Droplets className="h-6 w-6" />,
  testimony: <MessageSquareQuote className="h-6 w-6" />,
  baby_naming: <Baby className="h-6 w-6" />,
  baby_dedication: <HandHeart className="h-6 w-6" />,
};

export default function FormsLandingPage() {  const { t } = useTranslation(['forms', 'common']);

  const { data: capabilities } = useMyFormCapabilities();
  const canSeeSubmissions = (capabilities?.visibleFormTypes.length ?? 0) > 0;
  const canSeeAttendees = !!capabilities?.canSeeAttendees;
  const showAdminSection = canSeeSubmissions || canSeeAttendees;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('forms:formsDataCapture')}</h1>
        <p className="mt-1 text-muted-foreground">{t('forms:captureAltarCallResponsesBaptismAnd')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORM_TYPES.map((type) => {
          const definition = localiseFormDefinition(t, FORM_DEFINITIONS[type]);
          return (
            <Link key={type} href={`/forms/${type}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-ambient">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                    {FORM_ICONS[type]}
                  </span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">{definition.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#5D3FD3] group-hover:gap-2 transition-all">{t('forms:openForm')}<ChevronRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {showAdminSection ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t('forms:administration')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {canSeeSubmissions && (
              <Link href="/forms/submissions" className="group">
                <Card className="transition-shadow hover:shadow-ambient">
                  <CardContent className="flex items-center gap-4 py-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{t('forms:submissions')}</h3>
                      <p className="text-sm text-muted-foreground">{t('forms:reviewTriageAndExportFormSubmissions')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}

            {canSeeAttendees && (
              <Link href="/forms/attendees" className="group">
                <Card className="transition-shadow hover:shadow-ambient">
                  <CardContent className="flex items-center gap-4 py-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                      <Archive className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{t('forms:dormantAttendees')}</h3>
                      <p className="text-sm text-muted-foreground">{t('forms:bulkArchiveStaleFormCreatedContact')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
