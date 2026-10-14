import { z } from 'zod';
import { OAUTH_SCOPE_LIST } from './scopes';

/**
 * Redirect URIs are matched EXACTLY at authorize time, so what we accept here
 * is what we are willing to send an authorization code to. https only, plus
 * loopback http for local development; custom schemes only for public clients
 * (a mobile app's deep link). Never a fragment, never userinfo, never a wildcard.
 */
export function validateRedirectUri(raw: string, clientType: 'confidential' | 'public'): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'is not a valid URL';
  }
  if (raw.includes('*')) return 'cannot contain a wildcard';
  if (url.hash) return 'cannot contain a fragment';
  if (url.username || url.password) return 'cannot contain credentials';
  if (url.protocol === 'https:') return null;
  if (url.protocol === 'http:') {
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return loopback ? null : 'must use https (http is only allowed for localhost)';
  }
  if (clientType === 'public' && /^[a-z][a-z0-9+.-]*:$/.test(url.protocol)) return null;
  return 'must use https';
}

const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]).optional().transform((v) => (v ? v : undefined));

const clientFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  logoUrl: optionalUrl,
  homepageUrl: optionalUrl,
  privacyUrl: optionalUrl,
  termsUrl: optionalUrl,
  redirectUris: z.array(z.string().trim().min(1).max(1000)).min(1).max(20),
  allowedScopes: z.array(z.enum(OAUTH_SCOPE_LIST as [string, ...string[]])).min(1),
  isTrusted: z.boolean().default(false),
};

function refineClient<T extends { redirectUris: string[]; allowedScopes: string[]; clientType?: 'confidential' | 'public' }>(
  v: T,
  ctx: z.RefinementCtx,
  clientType: 'confidential' | 'public',
) {
  v.redirectUris.forEach((uri, i) => {
    const problem = validateRedirectUri(uri, clientType);
    if (problem) ctx.addIssue({ code: 'custom', path: ['redirectUris', i], message: `Redirect URI ${problem}` });
  });
  if (!v.allowedScopes.includes('openid')) {
    ctx.addIssue({ code: 'custom', path: ['allowedScopes'], message: 'The openid scope is required' });
  }
}

export const createClientSchema = z
  .object({ ...clientFields, clientType: z.enum(['confidential', 'public']) })
  .superRefine((v, ctx) => refineClient(v, ctx, v.clientType));
export type CreateClientInput = z.infer<typeof createClientSchema>;

// Type is fixed at creation (it decides whether a secret exists), so an update
// is validated against the stored type by the service, not here.
export const updateClientSchema = z.object({ ...clientFields, isActive: z.boolean().optional() }).partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

/** The authorize request: shared by the context lookup and the decision. */
export const authorizeParamsSchema = z.object({
  response_type: z.string().optional(),
  client_id: z.string().min(1).max(64),
  redirect_uri: z.string().max(1000).optional(),
  scope: z.string().max(500).optional(),
  state: z.string().max(1000).optional(),
  code_challenge: z.string().max(128).optional(),
  code_challenge_method: z.string().max(10).optional(),
  nonce: z.string().max(255).optional(),
});
export type AuthorizeParams = z.infer<typeof authorizeParamsSchema>;

export const authorizeDecisionSchema = authorizeParamsSchema.extend({ approve: z.boolean() });
