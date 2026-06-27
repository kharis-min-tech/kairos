'use client';

export const runtime = 'edge';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@kairos/ui';
import { isFormType } from '../_lib/form-meta';
import { AltarCallForm } from './_components/altar-call-form';
import { BaptismForm } from './_components/baptism-form';
import { TestimonyForm } from './_components/testimony-form';
import { BabyForm } from './_components/baby-form';
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
    case 'baby_naming':
      return <BabyForm mode="baby_naming" />;
    case 'baby_dedication':
      return <BabyForm mode="baby_dedication" />;
    default:
      return null;
  }
}
