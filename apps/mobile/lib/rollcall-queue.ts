import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecordAttendanceRequest } from '@kairos/types';
import { api } from './api-client';

/**
 * Offline queue for fellowship attendance saves. Keyed by meeting id so the
 * newest tap-set for a given meeting overwrites any older queued payload —
 * we always want the latest snapshot, not a replay of every intermediate
 * save-attempt.
 */

const KEY_PREFIX = 'rollcall:pending:';

export interface PendingRollcall {
  fellowshipId: string;
  meetingId: string;
  payload: RecordAttendanceRequest;
  queuedAt: string;
}

function keyFor(meetingId: string): string {
  return `${KEY_PREFIX}${meetingId}`;
}

export async function enqueueRollcall(entry: Omit<PendingRollcall, 'queuedAt'>): Promise<void> {
  const record: PendingRollcall = { ...entry, queuedAt: new Date().toISOString() };
  await AsyncStorage.setItem(keyFor(entry.meetingId), JSON.stringify(record));
}

export async function getPendingRollcall(meetingId: string): Promise<PendingRollcall | null> {
  const raw = await AsyncStorage.getItem(keyFor(meetingId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingRollcall;
  } catch {
    // Corrupted entry — drop it so it doesn't wedge the queue forever.
    await AsyncStorage.removeItem(keyFor(meetingId));
    return null;
  }
}

export async function clearPendingRollcall(meetingId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(meetingId));
}

export async function listAllPendingRollcalls(): Promise<PendingRollcall[]> {
  const keys = await AsyncStorage.getAllKeys();
  const pendingKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
  if (pendingKeys.length === 0) return [];
  const rows = await AsyncStorage.multiGet(pendingKeys);
  const out: PendingRollcall[] = [];
  for (const [, raw] of rows) {
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as PendingRollcall);
    } catch {
      // ignore corrupted entries — they'll get cleaned by getPending when read individually
    }
  }
  return out;
}

/**
 * Attempt to flush a specific pending record. Returns:
 *   'sent'    — payload accepted by the API, entry cleared
 *   'kept'    — attempt failed; entry left in place for a later retry
 *   'missing' — no entry to flush
 */
export async function flushPendingRollcall(meetingId: string): Promise<'sent' | 'kept' | 'missing'> {
  const entry = await getPendingRollcall(meetingId);
  if (!entry) return 'missing';
  try {
    await api.fellowships.attendance.record(entry.fellowshipId, entry.meetingId, entry.payload);
    await clearPendingRollcall(meetingId);
    return 'sent';
  } catch {
    return 'kept';
  }
}

/**
 * Best-effort flush of every queued rollcall. Individual failures leave
 * their entry in place; success clears them. Returns the number of entries
 * successfully sent.
 */
export async function flushAllPendingRollcalls(): Promise<number> {
  const pending = await listAllPendingRollcalls();
  let sent = 0;
  for (const entry of pending) {
    const result = await flushPendingRollcall(entry.meetingId);
    if (result === 'sent') sent += 1;
  }
  return sent;
}
