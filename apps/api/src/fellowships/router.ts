import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createFellowshipSchema,
  updateFellowshipSchema,
  createMeetingSchema,
  updateMeetingSchema,
  addMemberSchema,
  recordAttendanceSchema,
  listFellowshipsQuerySchema,
} from './schemas';
import {
  listFellowships,
  getFellowship,
  createFellowship,
  updateFellowship,
  deactivateFellowship,
  listFellowshipMembers,
  addFellowshipMember,
  removeFellowshipMember,
  listMeetings,
  createMeeting,
  updateMeeting,
  recordAttendance,
  getMeetingAttendance,
  getAttendanceSummary,
} from './service';

export const fellowshipsRouter = new Hono();

// All fellowship routes require authentication
fellowshipsRouter.use('*', authMiddleware);

// ── Fellowships CRUD ───────────────────────────────────────

fellowshipsRouter.get('/', zValidator('query', listFellowshipsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await listFellowships(db, auth, query);
  return c.json(successResponse(result));
});

fellowshipsRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const fellowship = await getFellowship(db, auth, c.req.param('id')!);
  return c.json(successResponse(fellowship));
});

fellowshipsRouter.post('/', requireRole('admin', 'pastor'), zValidator('json', createFellowshipSchema), async (c) => {
  const auth = getAuth(c);
  const fellowship = await createFellowship(db, auth, c.req.valid('json'));
  return c.json(successResponse(fellowship), 201);
});

fellowshipsRouter.patch('/:id', requireRole('admin', 'pastor'), zValidator('json', updateFellowshipSchema), async (c) => {
  const auth = getAuth(c);
  const fellowship = await updateFellowship(db, auth, c.req.param('id')!, c.req.valid('json'));
  return c.json(successResponse(fellowship));
});

fellowshipsRouter.delete('/:id', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const fellowship = await deactivateFellowship(db, auth, c.req.param('id')!);
  return c.json(successResponse(fellowship, 'Fellowship deactivated'));
});

// ── Fellowship Members ─────────────────────────────────────

fellowshipsRouter.get('/:id/members', async (c) => {
  const auth = getAuth(c);
  const members = await listFellowshipMembers(db, auth, c.req.param('id')!);
  return c.json(successResponse(members));
});

fellowshipsRouter.post('/:id/members', requireRole('admin', 'pastor'), zValidator('json', addMemberSchema), async (c) => {
  const auth = getAuth(c);
  const member = await addFellowshipMember(db, auth, c.req.param('id')!, c.req.valid('json'));
  return c.json(successResponse(member), 201);
});

fellowshipsRouter.delete('/:id/members/:memberId', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const result = await removeFellowshipMember(db, auth, c.req.param('id')!, c.req.param('memberId')!);
  return c.json(successResponse(result, 'Member removed from fellowship'));
});

// ── Fellowship Meetings ────────────────────────────────────

fellowshipsRouter.get('/:id/meetings', async (c) => {
  const auth = getAuth(c);
  const meetings = await listMeetings(db, auth, c.req.param('id')!);
  return c.json(successResponse(meetings));
});

fellowshipsRouter.post('/:id/meetings', requireRole('admin', 'pastor'), zValidator('json', createMeetingSchema), async (c) => {
  const auth = getAuth(c);
  const meeting = await createMeeting(db, auth, c.req.param('id')!, c.req.valid('json'));
  return c.json(successResponse(meeting), 201);
});

fellowshipsRouter.patch('/:id/meetings/:meetingId', requireRole('admin', 'pastor'), zValidator('json', updateMeetingSchema), async (c) => {
  const auth = getAuth(c);
  const meeting = await updateMeeting(db, auth, c.req.param('id')!, c.req.param('meetingId')!, c.req.valid('json'));
  return c.json(successResponse(meeting));
});

// ── Meeting Attendance ─────────────────────────────────────

fellowshipsRouter.post('/:id/meetings/:meetingId/attendance', requireRole('admin', 'pastor'), zValidator('json', recordAttendanceSchema), async (c) => {
  const auth = getAuth(c);
  const { records } = c.req.valid('json');
  await recordAttendance(db, auth, c.req.param('id')!, c.req.param('meetingId')!, records);
  return c.json(successResponse(null, 'Attendance recorded'));
});

fellowshipsRouter.get('/:id/meetings/:meetingId/attendance', async (c) => {
  const auth = getAuth(c);
  const attendance = await getMeetingAttendance(db, auth, c.req.param('id')!, c.req.param('meetingId')!);
  return c.json(successResponse(attendance));
});

fellowshipsRouter.get('/:id/attendance/summary', async (c) => {
  const auth = getAuth(c);
  const summary = await getAttendanceSummary(db, auth, c.req.param('id')!);
  return c.json(successResponse(summary));
});
