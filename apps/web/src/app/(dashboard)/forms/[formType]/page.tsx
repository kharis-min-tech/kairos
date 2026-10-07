'use client';

export const runtime = 'edge';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@kairos/ui';
import { DeclarativeForm } from './_components/declarative-form';
import { FORM_DEFINITIONS, isFormType } from '@kairos/types';

/**
 * Every form renders from its definition.
 *
 * There used to be a bespoke component per form beside the declarative
 * renderer, and the two drifted: web's baby forms asked for parent names where
 * mobile captured references, and web's testimony used Yes/No radios where the
 * definition used checkboxes. The questions matched by nobody's decision in
 * particular. One renderer, one definition per form, one set of questions on
 * both platforms — including the success copy, which mobile previously had no
 * way to reach.
 */
export default function FormFillPage({
  params,
}: {
  params: Promise<{ formType: string }>;
}) {
  const { formType } = use(params);

  const definition = isFormType(formType) ? FORM_DEFINITIONS[formType] : undefined;

  if (!definition) {
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

  return <DeclarativeForm definition={definition} />;
}
