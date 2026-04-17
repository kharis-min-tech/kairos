import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '../lib/response';
import { departments, branchDepartments } from '@kairos/database';

export const departmentsRouter = new Hono();

departmentsRouter.use('*', authMiddleware);

/**
 * GET /api/departments?branchId=<uuid>
 *
 * Lists active branch departments for a given branch.
 * Non-admins are automatically scoped to their own branch.
 */
departmentsRouter.get('/', async (c) => {
  const auth = getAuth(c);
  const branchIdParam = c.req.query('branchId');
  const branchId =
    auth.systemRole === 'admin' && branchIdParam ? branchIdParam : auth.branchId;

  const rows = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      departmentId: branchDepartments.departmentId,
      departmentName: departments.departmentName,
      description: departments.description,
    })
    .from(branchDepartments)
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
      ),
    )
    .orderBy(departments.departmentName);

  return c.json(successResponse(rows));
});
