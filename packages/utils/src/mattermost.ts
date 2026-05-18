/**
 * Mattermost REST API v4 client helper.
 *
 * All functions are fire-and-forget safe — they log errors without throwing
 * so that Mattermost unavailability never breaks the core Kairos flows.
 *
 * Required env vars:
 *   MATTERMOST_URL          e.g. http://localhost:8065
 *   MATTERMOST_BOT_TOKEN    Personal access token of the kairos-system admin account
 */

import { logger } from './logger';

const mmLogger = logger;

function mmUrl(): string {
  return (process.env.MATTERMOST_URL ?? 'http://localhost:8065').replace(/\/$/, '');
}

function mmToken(): string {
  return process.env.MATTERMOST_BOT_TOKEN ?? '';
}

async function mmFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${mmUrl()}/api/v4${path}`;
  const token = mmToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface MMUser {
  id: string;
  username: string;
  email: string;
}

export interface MMChannel {
  id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P' | 'D' | 'G'; // Open | Private | Direct | Group
}

// ── Team helpers ─────────────────────────────────────────────────────────────

/** Returns the ID of the first available team (fallback). */
export async function getDefaultTeamId(): Promise<string | null> {
  try {
    const res = await mmFetch('/teams');
    if (!res.ok) return null;
    const teams = (await res.json()) as Array<{ id: string }>;
    return teams[0]?.id ?? null;
  } catch (err) {
    mmLogger.warn('Mattermost: failed to get default team', { err });
    return null;
  }
}

/**
 * Gets an existing Mattermost team by name, or creates it if it doesn't exist.
 * Returns the team ID, or null on failure.
 * Teams are invite-only (type: 'I') so members must be explicitly added.
 */
export async function mmGetOrCreateTeam(
  name: string,
  displayName: string,
): Promise<string | null> {
  try {
    // Try to find existing team by name
    const findRes = await mmFetch(`/teams/name/${encodeURIComponent(name)}`);
    if (findRes.ok) {
      const team = (await findRes.json()) as { id: string };
      return team.id;
    }
    // Create it
    const createRes = await mmFetch('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, display_name: displayName, type: 'I' }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      mmLogger.warn('Mattermost: failed to create team', { name, status: createRes.status, body });
      return null;
    }
    const team = (await createRes.json()) as { id: string };
    mmLogger.info('Mattermost: team created', { name, teamId: team.id });
    return team.id;
  } catch (err) {
    mmLogger.warn('Mattermost: getOrCreateTeam exception', { name, err });
    return null;
  }
}

/** Adds a user to a Mattermost team. Fire-and-forget safe. */
export async function mmAddUserToTeam(teamId: string, mmUserId: string): Promise<boolean> {
  try {
    const res = await mmFetch(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, user_id: mmUserId }),
    });
    if (!res.ok) {
      const body = await res.text();
      mmLogger.warn('Mattermost: failed to add user to team', { teamId, mmUserId, status: res.status, body });
      return false;
    }
    return true;
  } catch (err) {
    mmLogger.warn('Mattermost: addUserToTeam exception', { teamId, mmUserId, err });
    return false;
  }
}

/** Slugifies a branch name into a valid Mattermost team name (lowercase, hyphens, max 64 chars). */
export function branchTeamName(branchId: string, branchName: string): string {
  const slug = branchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 55);
  return `${slug}-${branchId.slice(0, 8)}`;
}

// ── User management ──────────────────────────────────────────────────────────

/** Looks up an existing Mattermost user by email. Returns their ID or null. */
async function mmGetUserByEmail(email: string): Promise<string | null> {
  try {
    const res = await mmFetch(`/users/email/${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const user = (await res.json()) as MMUser;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Creates a Mattermost user account for a Kairos member.
 * Accepts an optional password; generates one if not provided.
 * Returns `{ userId, password }` on success, or null on failure.
 * The password must be stored by the caller so the member can be auto-logged in later.
 */
export async function mmCreateUser(
  email: string,
  username: string,
  firstName: string,
  lastName: string,
  password?: string,
): Promise<{ userId: string; password: string } | null> {
  try {
    const pw = password ?? `Krs-${crypto.randomUUID()}`;
    const res = await mmFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ email, username, password: pw, first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) {
      const body = await res.text();
      const parsed = JSON.parse(body) as { id?: string };
      // If email already exists, look up the existing user by email
      if (parsed.id === 'app.user.save.email_exists.app_error') {
        const existingId = await mmGetUserByEmail(email);
        return existingId ? { userId: existingId, password: pw } : null;
      }
      mmLogger.warn('Mattermost: failed to create user', { email, status: res.status, body });
      return null;
    }
    const user = (await res.json()) as MMUser;
    mmLogger.info('Mattermost: user created', { email, mmUserId: user.id });
    return { userId: user.id, password: pw };
  } catch (err) {
    mmLogger.warn('Mattermost: createUser exception', { email, err });
    return null;
  }
}

/**
 * Deactivates (soft-deletes) a Mattermost user.
 * Called when a Kairos member is set to isActive = false.
 */
export async function mmDeactivateUser(mmUserId: string): Promise<void> {
  try {
    const res = await mmFetch(`/users/${mmUserId}`, { method: 'DELETE' });
    if (!res.ok) {
      mmLogger.warn('Mattermost: failed to deactivate user', { mmUserId, status: res.status });
    } else {
      mmLogger.info('Mattermost: user deactivated', { mmUserId });
    }
  } catch (err) {
    mmLogger.warn('Mattermost: deactivateUser exception', { mmUserId, err });
  }
}

/**
 * Generates a one-time login token for a Mattermost user so Kairos can drop
 * the member straight into the Mattermost UI without requiring a separate password.
 * Returns the token string, or null on failure.
 */
export async function mmGenerateLoginToken(mmUserId: string): Promise<string | null> {
  try {
    const res = await mmFetch(`/users/${mmUserId}/tokens`, {
      method: 'POST',
      body: JSON.stringify({ description: 'kairos-sso' }),
    });
    if (!res.ok) {
      mmLogger.warn('Mattermost: failed to generate login token', { mmUserId, status: res.status });
      return null;
    }
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch (err) {
    mmLogger.warn('Mattermost: generateLoginToken exception', { mmUserId, err });
    return null;
  }
}

// ── Channel management ───────────────────────────────────────────────────────

/**
 * Returns an existing channel by name, or creates it if it doesn't exist.
 * All channels are private (type: 'P') so only members explicitly added can see them.
 */
export async function mmGetOrCreateChannel(
  teamId: string,
  name: string,
  displayName: string,
  type: 'O' | 'P' = 'P',
): Promise<string | null> {
  try {
    // Try to get existing channel first
    const getRes = await mmFetch(`/teams/${teamId}/channels/name/${name}`);
    if (getRes.ok) {
      const ch = (await getRes.json()) as MMChannel;
      return ch.id;
    }

    // Create it
    const createRes = await mmFetch('/channels', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, name, display_name: displayName, type }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      mmLogger.warn('Mattermost: failed to create channel', { name, status: createRes.status, body });
      return null;
    }
    const ch = (await createRes.json()) as MMChannel;
    mmLogger.info('Mattermost: channel created', { name, channelId: ch.id });
    return ch.id;
  } catch (err) {
    mmLogger.warn('Mattermost: getOrCreateChannel exception', { name, err });
    return null;
  }
}

/**
 * Adds a Mattermost user to a channel.
 */
export async function mmAddUserToChannel(channelId: string, mmUserId: string): Promise<void> {
  try {
    const res = await mmFetch(`/channels/${channelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: mmUserId }),
    });
    if (!res.ok) {
      mmLogger.warn('Mattermost: failed to add user to channel', { channelId, mmUserId, status: res.status });
    } else {
      mmLogger.info('Mattermost: user added to channel', { channelId, mmUserId });
    }
  } catch (err) {
    mmLogger.warn('Mattermost: addUserToChannel exception', { channelId, mmUserId, err });
  }
}

/**
 * Removes a Mattermost user from a channel.
 */
export async function mmRemoveUserFromChannel(channelId: string, mmUserId: string): Promise<void> {
  try {
    const res = await mmFetch(`/channels/${channelId}/members/${mmUserId}`, { method: 'DELETE' });
    if (!res.ok) {
      mmLogger.warn('Mattermost: failed to remove user from channel', { channelId, mmUserId, status: res.status });
    } else {
      mmLogger.info('Mattermost: user removed from channel', { channelId, mmUserId });
    }
  } catch (err) {
    mmLogger.warn('Mattermost: removeUserFromChannel exception', { channelId, mmUserId, err });
  }
}

/**
 * Posts a message to a channel as the bot/service account.
 */
export async function mmPostMessage(channelId: string, message: string): Promise<void> {
  try {
    const res = await mmFetch('/posts', {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, message }),
    });
    if (!res.ok) {
      mmLogger.warn('Mattermost: failed to post message', { channelId, status: res.status });
    } else {
      mmLogger.info('Mattermost: message posted', { channelId });
    }
  } catch (err) {
    mmLogger.warn('Mattermost: postMessage exception', { channelId, err });
  }
}

// ── Convenience channel-name builders ────────────────────────────────────────

/** Slugified channel name for a branch */
export function branchChannelName(branchId: string): string {
  return `branch-${branchId.replace(/-/g, '').slice(0, 20)}`;
}

/** Slugified channel name for a fellowship */
export function fellowshipChannelName(fellowshipId: string): string {
  return `fellowship-${fellowshipId.replace(/-/g, '').slice(0, 16)}`;
}

/** Slugified channel name for a department */
export function departmentChannelName(branchDeptId: string): string {
  return `dept-${branchDeptId.replace(/-/g, '').slice(0, 20)}`;
}
