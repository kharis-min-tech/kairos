/**
 * Auth utility functions
 * All authentication is handled via Cognito OIDC (react-oidc-context).
 * This module provides helper utilities only — no direct sign-in/sign-up logic.
 */

/**
 * Map raw auth errors to user-friendly messages.
 * Never expose internal details in production.
 */
export function getAuthErrorMessage(error: Error | unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  const msg = error.message.toLowerCase();

  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (msg.includes('expired') || msg.includes('token')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (msg.includes('unauthorized') || msg.includes('401')) {
    return 'You are not authorized. Please sign in.';
  }
  if (msg.includes('invalid_grant') || msg.includes('invalid grant')) {
    return 'Invalid credentials. Please try again.';
  }

  // Generic fallback — never leak internal error details
  return 'Something went wrong. Please try again or contact support.';
}

/**
 * Clear only auth-related items from storage.
 * Never call localStorage.clear() / sessionStorage.clear() as it
 * destroys unrelated application state.
 */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;

  const AUTH_KEYS_PREFIX = 'oidc.';

  // Remove OIDC-specific keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(AUTH_KEYS_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(AUTH_KEYS_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}
