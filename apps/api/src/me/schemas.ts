import { z } from 'zod';

/**
 * Response shape for GET /api/me/leadership — echoes the branch-admin
 * authority lists from the caller's AuthContext alongside the
 * fellowships and branch-departments they lead or co-/deputy-lead.
 */
export const meLeadershipResponseSchema = z.object({
  branchSystemAdminBranchIds: z.array(z.string().uuid()),
  branchDataAdminBranchIds: z.array(z.string().uuid()),
  leadFellowships: z.array(
    z.object({
      id: z.string().uuid(),
      fellowshipName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  coLeadFellowships: z.array(
    z.object({
      id: z.string().uuid(),
      fellowshipName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  leadDepartments: z.array(
    z.object({
      id: z.string().uuid(),
      departmentName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  deputyDepartments: z.array(
    z.object({
      id: z.string().uuid(),
      departmentName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
});

export type MeLeadershipResponseShape = z.infer<typeof meLeadershipResponseSchema>;
