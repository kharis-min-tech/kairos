// @kairos/api - Auth module exports
// Custom Authorizer Lambda and supporting utilities

// Main authorizer handler
export { handler } from './authorizer';
export type { AuthorizerContext } from './authorizer';

// Cognito JWT verification
export { verifyCognitoToken, resetVerifier } from './cognito';
export type { CognitoTokenPayload } from './cognito';

// Member lookup and role resolution
export { lookupMember } from './member-lookup';
export type { MemberLookupResult } from './member-lookup';
