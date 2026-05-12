import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createBranchDepartmentSchema,
  updateBranchDepartmentSchema,
  listBranchDepartmentsQuerySchema,
  addDepartmentMemberSchema,
  createJoinRequestSchema,
  listJoinRequestsQuerySchema,
  scheduleInterviewSchema,
  recordInterviewSchema,
  extendOfferSchema,
  respondToOfferSchema,
  rejectJoinRequestSchema,
  evaluateProbationSchema,
  createGlobalDepartmentSchema,
  updateGlobalDepartmentSchema,
  createDepartmentFollowupSchema,
  updateDepartmentFollowupSchema,
  listDepartmentFollowupsQuerySchema,
  overdueFollowupsQuerySchema,
  createOutfitSchema,
  updateOutfitSchema,
  listOutfitsQuerySchema,
  assignScheduleSchema,
  listScheduleQuerySchema,
  createRotaTemplateSchema,
  updateRotaTemplateSchema,
  createRotaSlotSchema,
  updateRotaSlotSchema,
  addPoolMemberSchema,
  generateRotaSchema,
  updateInstanceStatusSchema,
  updateAssignmentSchema,
  createSwapRequestSchema,
  reviewSwapRequestSchema,
  listInstancesQuerySchema,
  listSwapRequestsQuerySchema,
} from './schemas';
import {
  listGlobalDepartments,
  createGlobalDepartment,
  updateGlobalDepartment,
  listBranchDepartments,
  getBranchDepartment,
  createBranchDepartment,
  updateBranchDepartment,
  deactivateBranchDepartment,
  listDepartmentMembers,
  addDepartmentMember,
  removeDepartmentMember,
  createJoinRequest,
  listJoinRequests,
  scheduleJoinRequestInterview,
  recordJoinRequestInterview,
  extendJoinRequestOffer,
  respondToJoinRequestOffer,
  withdrawJoinRequest,
  rejectJoinRequest,
  evaluateJoinRequestProbation,
  listMyDepartments,
  listMyJoinRequests,
} from './service';
import {
  createFollowup,
  updateFollowup,
  deleteFollowup,
  listFollowupsForMember,
  listFollowupsForDepartment,
  listOverdueFollowups,
} from './followups-service';
import {
  listOutfits,
  createOutfit,
  updateOutfit,
  deactivateOutfit,
  listSchedule,
  assignSchedule,
  removeAssignment,
  listUpcomingAssignments,
} from './uniform-service';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deactivateTemplate,
  listSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  listPool,
  addPoolMember,
  removePoolMember,
  generateRota,
  listInstances,
  getInstance,
  updateInstanceStatus,
  updateAssignment,
  createSwapRequest,
  listSwapRequests,
  reviewSwapRequest,
} from './rota-service';

export const departmentsRouter = new Hono();

departmentsRouter.use('*', authMiddleware);

// ── Global department catalogue ────────────────────────────

departmentsRouter.get('/global', async (c) => {
  const rows = await listGlobalDepartments(db);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/global',
  requireRole('admin'),
  zValidator('json', createGlobalDepartmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createGlobalDepartment(db, auth, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.patch(
  '/global/:id',
  requireRole('admin'),
  zValidator('json', updateGlobalDepartmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateGlobalDepartment(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(updated));
  },
);

// ── My departments (member-facing) ─────────────────────────

departmentsRouter.get('/mine', async (c) => {
  const auth = getAuth(c);
  const rows = await listMyDepartments(db, auth);
  return c.json(successResponse(rows));
});

departmentsRouter.get('/me/join-requests', async (c) => {
  const auth = getAuth(c);
  const rows = await listMyJoinRequests(db, auth);
  return c.json(successResponse(rows));
});

// ── Branch department CRUD ─────────────────────────────────

departmentsRouter.get('/', zValidator('query', listBranchDepartmentsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const result = await listBranchDepartments(db, auth, c.req.valid('query'));
  return c.json(successResponse(result));
});

departmentsRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const dept = await getBranchDepartment(db, auth, c.req.param('id')!);
  return c.json(successResponse(dept));
});

departmentsRouter.post(
  '/',
  requireRole('admin', 'pastor'),
  zValidator('json', createBranchDepartmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const dept = await createBranchDepartment(db, auth, c.req.valid('json'));
    return c.json(successResponse(dept), 201);
  },
);

departmentsRouter.patch(
  '/:id',
  zValidator('json', updateBranchDepartmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const dept = await updateBranchDepartment(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(dept));
  },
);

departmentsRouter.delete('/:id', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const dept = await deactivateBranchDepartment(db, auth, c.req.param('id')!);
  return c.json(successResponse(dept, 'Department deactivated'));
});

// ── Department members ─────────────────────────────────────

departmentsRouter.get('/:id/members', async (c) => {
  const auth = getAuth(c);
  const rows = await listDepartmentMembers(db, auth, c.req.param('id')!);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/members',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('json', addDepartmentMemberSchema),
  async (c) => {
    const auth = getAuth(c);
    const member = await addDepartmentMember(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(member), 201);
  },
);

departmentsRouter.delete(
  '/:id/members/:memberId',
  requireRole('admin', 'pastor', 'leader'),
  async (c) => {
    const auth = getAuth(c);
    const result = await removeDepartmentMember(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('memberId')!,
    );
    return c.json(successResponse(result, 'Member removed from department'));
  },
);

// ── Join requests ──────────────────────────────────────────

departmentsRouter.post(
  '/:id/join-requests',
  zValidator('json', createJoinRequestSchema),
  async (c) => {
    const auth = getAuth(c);
    const request = await createJoinRequest(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(request), 201);
  },
);

departmentsRouter.get(
  '/:id/join-requests',
  zValidator('query', listJoinRequestsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const requests = await listJoinRequests(
      db,
      auth,
      c.req.param('id')!,
      c.req.valid('query'),
    );
    return c.json(successResponse(requests));
  },
);

departmentsRouter.post(
  '/:id/join-requests/:requestId/schedule-interview',
  zValidator('json', scheduleInterviewSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await scheduleJoinRequestInterview(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

departmentsRouter.post(
  '/:id/join-requests/:requestId/record-interview',
  zValidator('json', recordInterviewSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await recordJoinRequestInterview(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

departmentsRouter.post(
  '/:id/join-requests/:requestId/extend-offer',
  zValidator('json', extendOfferSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await extendJoinRequestOffer(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

departmentsRouter.post(
  '/:id/join-requests/:requestId/respond-offer',
  zValidator('json', respondToOfferSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await respondToJoinRequestOffer(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

departmentsRouter.post('/:id/join-requests/:requestId/withdraw', async (c) => {
  const auth = getAuth(c);
  const result = await withdrawJoinRequest(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('requestId')!,
  );
  return c.json(successResponse(result));
});

departmentsRouter.post(
  '/:id/join-requests/:requestId/reject',
  zValidator('json', rejectJoinRequestSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await rejectJoinRequest(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

departmentsRouter.post(
  '/:id/join-requests/:requestId/evaluate-probation',
  zValidator('json', evaluateProbationSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await evaluateJoinRequestProbation(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

// ── Followups ──────────────────────────────────────────────

departmentsRouter.get(
  '/:id/followups',
  zValidator('query', listDepartmentFollowupsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listFollowupsForDepartment(
      db,
      auth,
      c.req.param('id')!,
      c.req.valid('query'),
    );
    return c.json(successResponse(rows));
  },
);

departmentsRouter.get(
  '/:id/followups/overdue',
  zValidator('query', overdueFollowupsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const { days } = c.req.valid('query');
    const rows = await listOverdueFollowups(db, auth, c.req.param('id')!, days);
    return c.json(successResponse(rows));
  },
);

departmentsRouter.get('/:id/members/:memberId/followups', async (c) => {
  const auth = getAuth(c);
  const rows = await listFollowupsForMember(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('memberId')!,
  );
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/members/:memberId/followups',
  zValidator('json', createDepartmentFollowupSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createFollowup(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('memberId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.patch(
  '/:id/followups/:followupId',
  zValidator('json', updateDepartmentFollowupSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateFollowup(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('followupId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

departmentsRouter.delete('/:id/followups/:followupId', async (c) => {
  const auth = getAuth(c);
  const result = await deleteFollowup(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('followupId')!,
  );
  return c.json(successResponse(result, 'Followup deleted'));
});

// ── Uniform: outfits ───────────────────────────────────────

departmentsRouter.get(
  '/:id/uniforms',
  zValidator('query', listOutfitsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listOutfits(db, auth, c.req.param('id')!, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

departmentsRouter.post(
  '/:id/uniforms',
  zValidator('json', createOutfitSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createOutfit(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.patch(
  '/:id/uniforms/:outfitId',
  zValidator('json', updateOutfitSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateOutfit(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('outfitId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

departmentsRouter.delete('/:id/uniforms/:outfitId', async (c) => {
  const auth = getAuth(c);
  const result = await deactivateOutfit(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('outfitId')!,
  );
  return c.json(successResponse(result, 'Outfit archived'));
});

// ── Uniform: schedule ──────────────────────────────────────

departmentsRouter.get(
  '/:id/uniform-schedule',
  zValidator('query', listScheduleQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listSchedule(db, auth, c.req.param('id')!, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

departmentsRouter.get('/:id/uniform-schedule/upcoming', async (c) => {
  const auth = getAuth(c);
  const rows = await listUpcomingAssignments(db, auth, c.req.param('id')!);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/uniform-schedule',
  zValidator('json', assignScheduleSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await assignSchedule(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.delete('/:id/uniform-schedule/:assignmentId', async (c) => {
  const auth = getAuth(c);
  const result = await removeAssignment(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('assignmentId')!,
  );
  return c.json(successResponse(result, 'Assignment removed'));
});

// ── Rota templates ─────────────────────────────────────────

departmentsRouter.get('/:id/rota-templates', async (c) => {
  const auth = getAuth(c);
  const rows = await listTemplates(db, auth, c.req.param('id')!);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/rota-templates',
  zValidator('json', createRotaTemplateSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createTemplate(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.patch(
  '/:id/rota-templates/:templateId',
  zValidator('json', updateRotaTemplateSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateTemplate(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

departmentsRouter.delete('/:id/rota-templates/:templateId', async (c) => {
  const auth = getAuth(c);
  await deactivateTemplate(db, auth, c.req.param('id')!, c.req.param('templateId')!);
  return c.json(successResponse({ id: c.req.param('templateId')! }, 'Template archived'));
});

// ── Rota slots ─────────────────────────────────────────────

departmentsRouter.get('/:id/rota-templates/:templateId/slots', async (c) => {
  const auth = getAuth(c);
  const rows = await listSlots(db, auth, c.req.param('id')!, c.req.param('templateId')!);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/rota-templates/:templateId/slots',
  zValidator('json', createRotaSlotSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createSlot(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.patch(
  '/:id/rota-templates/:templateId/slots/:slotId',
  zValidator('json', updateRotaSlotSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateSlot(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.param('slotId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

departmentsRouter.delete(
  '/:id/rota-templates/:templateId/slots/:slotId',
  async (c) => {
    const auth = getAuth(c);
    await deleteSlot(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.param('slotId')!,
    );
    return c.json(successResponse({ id: c.req.param('slotId')! }, 'Slot archived'));
  },
);

// ── Rota pool ──────────────────────────────────────────────

departmentsRouter.get('/:id/rota-templates/:templateId/pool', async (c) => {
  const auth = getAuth(c);
  const rows = await listPool(db, auth, c.req.param('id')!, c.req.param('templateId')!);
  return c.json(successResponse(rows));
});

departmentsRouter.post(
  '/:id/rota-templates/:templateId/pool',
  zValidator('json', addPoolMemberSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await addPoolMember(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.delete(
  '/:id/rota-templates/:templateId/pool/:poolMemberId',
  async (c) => {
    const auth = getAuth(c);
    const result = await removePoolMember(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.param('poolMemberId')!,
    );
    return c.json(successResponse(result, 'Pool member removed'));
  },
);

// ── Rota generation ────────────────────────────────────────

departmentsRouter.post(
  '/:id/rota-templates/:templateId/generate',
  zValidator('json', generateRotaSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await generateRota(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('templateId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(result));
  },
);

// ── Rota instances ─────────────────────────────────────────

departmentsRouter.get(
  '/:id/rota-instances',
  zValidator('query', listInstancesQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listInstances(db, auth, c.req.param('id')!, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

departmentsRouter.get('/:id/rota-instances/:instanceId', async (c) => {
  const auth = getAuth(c);
  const result = await getInstance(
    db,
    auth,
    c.req.param('id')!,
    c.req.param('instanceId')!,
  );
  return c.json(successResponse(result));
});

departmentsRouter.patch(
  '/:id/rota-instances/:instanceId',
  zValidator('json', updateInstanceStatusSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateInstanceStatus(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('instanceId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

departmentsRouter.patch(
  '/:id/rota-instances/:instanceId/assignments/:assignmentId',
  zValidator('json', updateAssignmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await updateAssignment(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('instanceId')!,
      c.req.param('assignmentId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);

// ── Rota swap requests ─────────────────────────────────────

departmentsRouter.post(
  '/:id/rota-instances/:instanceId/assignments/:assignmentId/swap-requests',
  zValidator('json', createSwapRequestSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createSwapRequest(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('instanceId')!,
      c.req.param('assignmentId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(created), 201);
  },
);

departmentsRouter.get(
  '/:id/rota-swap-requests',
  zValidator('query', listSwapRequestsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listSwapRequests(db, auth, c.req.param('id')!, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

departmentsRouter.patch(
  '/:id/rota-swap-requests/:requestId',
  zValidator('json', reviewSwapRequestSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await reviewSwapRequest(
      db,
      auth,
      c.req.param('id')!,
      c.req.param('requestId')!,
      c.req.valid('json'),
    );
    return c.json(successResponse(updated));
  },
);
