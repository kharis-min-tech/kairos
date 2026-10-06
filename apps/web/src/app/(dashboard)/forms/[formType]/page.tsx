'use client';

export const runtime = 'edge';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@kairos/ui';
import { isFormType } from '../_lib/form-meta';
import { AltarCallForm } from './_components/altar-call-form';
import { BaptismForm } from './_components/baptism-form';
import { TestimonyForm } from './_components/testimony-form';
import { DeclarativeForm } from './_components/declarative-form';
import { FORM_DEFINITIONS } from '@kairos/types';

export default function FormFillPage({
  params,
}: {
  params: Promise<{ formType: string }>;
}) {
  const { formType } = use(params);

  if (!isFormType(formType)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Form not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          “{formType}” isn’t a form we recognise.
        </p>
        <Link href="/forms" className="mt-6 inline-block">
          <Button className="bg-[#5D3FD3] hover:bg-[#451ebb]">Back to forms</Button>
        </Link>
      </div>
    );
  }

  switch (formType) {
    case 'first_time_visitor': {
      const definition = FORM_DEFINITIONS.first_time_visitor!;
      return (
        <DeclarativeForm
          definition={definition}
          successTitle="Welcome recorded"
          successMessage="Thank you for visiting. A leader will reach out to you soon."
        />
      );
    }
    case 'altar_call':
      return <AltarCallForm />;
    case 'baptism':
      return <BaptismForm />;
    case 'testimony':
      return <TestimonyForm />;
    // Both baby forms render from the shared definition rather than a bespoke
    // component. The definition already declared `fatherMemberId` /
    // `motherMemberId` with their free-text twins, and mobile was already
    // rendering it — the bespoke web component only ever asked for plain names,
    // so the same form produced different data depending on the device.
    case 'baby_naming':
      return (
        <DeclarativeForm
          definition={FORM_DEFINITIONS.baby_naming!}
          successTitle="Naming request submitted"
          successMessage="Your request has been recorded. A leader will follow up to confirm a date."
        />
      );
    case 'baby_dedication':
      return (
        <DeclarativeForm
          definition={FORM_DEFINITIONS.baby_dedication!}
          successTitle="Dedication request submitted"
          successMessage="Your request has been recorded. A leader will follow up to confirm a date."
        />
      );
    default:
      return null;
  }
}
