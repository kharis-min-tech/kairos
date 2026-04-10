import { eq, and, desc, count } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { forms, formSubmissions } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError } from '@kairos/utils';
import { autoEnroll } from '../new-believers/service';
import type {
  CreateFormInput,
  ListFormsQuery,
  SubmitFormInput,
  ListSubmissionsQuery,
  HandlePrebuiltInput,
} from './schemas';

// ── Helpers ────────────────────────────────────────────────

function enforceBranchScope(auth: AuthContext, targetBranchId: string | null | undefined) {
  if (auth.systemRole === 'admin') return;
  if (targetBranchId && auth.branchId !== targetBranchId) {
    throw new ForbiddenError('You can only access forms for your branch');
  }
}

// ── Form Definitions ──────────────────────────────────────

export async function listForms(db: Database, auth: AuthContext, query: ListFormsQuery) {
  const { page, limit, isActive } = query;

  const conditions = [];
  if (auth.systemRole !== 'admin') {
    // Non-admins see church-wide forms + forms for their branch
    conditions.push(
      eq(forms.scope, 'Church-wide'),
    );
  }
  if (isActive !== undefined) conditions.push(eq(forms.isActive, isActive));

  const rows = await db
    .select()
    .from(forms)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(forms.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db
    .select({ total: count() })
    .from(forms)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { forms: rows, total: totalResult[0]?.total ?? 0, page, limit };
}

export async function createForm(db: Database, auth: AuthContext, data: CreateFormInput) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins or pastors can create forms');
  }

  const scope = data.targetBranchId ? 'Branch-specific' : 'Church-wide';
  if (scope === 'Branch-specific') {
    enforceBranchScope(auth, data.targetBranchId);
  }

  const [form] = await db
    .insert(forms)
    .values({
      formName: data.title,
      formDescription: data.description,
      formDefinition: data.fields ?? {},
      scope,
      targetBranchId: data.targetBranchId,
      createdBy: auth.memberId,
    })
    .returning();

  return form;
}

export async function getForm(db: Database, auth: AuthContext, id: string) {
  const [form] = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  if (!form) throw new NotFoundError('Form not found');
  enforceBranchScope(auth, form.targetBranchId);
  return form;
}

// ── Form Submissions ──────────────────────────────────────

export async function submitForm(
  db: Database,
  auth: AuthContext,
  formId: string,
  data: SubmitFormInput,
) {
  const form = await getForm(db, auth, formId);
  if (!form.isActive) {
    throw new ForbiddenError('This form is no longer accepting submissions');
  }

  const [submission] = await db
    .insert(formSubmissions)
    .values({
      formId,
      memberId: auth.memberId,
      submissionData: { ...data.data, notes: data.notes },
    })
    .returning();

  return submission;
}

export async function listSubmissions(
  db: Database,
  auth: AuthContext,
  query: ListSubmissionsQuery,
) {
  const { page, limit, formId } = query;

  // Only admins/pastors can list all submissions; others see their own
  const conditions = [];
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    conditions.push(eq(formSubmissions.memberId, auth.memberId));
  }
  if (formId) conditions.push(eq(formSubmissions.formId, formId));

  const rows = await db
    .select()
    .from(formSubmissions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db
    .select({ total: count() })
    .from(formSubmissions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { submissions: rows, total: totalResult[0]?.total ?? 0, page, limit };
}

// ── Prebuilt Form Handling ────────────────────────────────

/**
 * Handle pre-built form submissions that don't require a form definition.
 * The altar-call form is the key integration point for autoEnroll.
 */
export async function handlePrebuilt(
  db: Database,
  auth: AuthContext,
  input: HandlePrebuiltInput,
) {
  // Persist the raw submission data (no formId — pre-built forms are schema-less)
  const [submission] = await db
    .insert(formSubmissions)
    .values({
      formId: null,
      memberId: auth.memberId,
      submissionData: {
        formType: input.formType,
        ...input.data,
        notes: input.notes,
      },
    })
    .returning();

  // ── Altar-call integration: auto-enrol the member in New Believers class ──
  if (input.formType === 'altar-call') {
    await autoEnroll(db, auth.memberId, auth.branchId);
  }

  return {
    submission,
    action:
      input.formType === 'altar-call'
        ? 'auto-enrolled in New Believers class'
        : 'recorded',
  };
}
