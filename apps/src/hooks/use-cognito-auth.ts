"use client";

import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig, cognitoDomain, buildAuthUrl, getBaseUrl } from "../lib/auth-config";
import { clearAuthStorage, getAuthErrorMessage } from "../lib/auth";

export function useCognitoAuth() {
  const auth = useAuth();

  const signOutRedirect = async () => {
    try {
      // First, clear the local session
      await auth.removeUser();
      
      // Then redirect to Cognito logout to clear server-side session
      const logoutUri = encodeURIComponent(getBaseUrl());
      
      // Use the proper Cognito logout URL
      const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${logoutUri}`;
      
      // Small delay to ensure local cleanup completes
      setTimeout(() => {
        window.location.href = logoutUrl;
      }, 100);
    } catch (error) {
      console.error("Error during sign out:", error);
      // Fallback: force redirect to logout even if local cleanup fails
      const logoutUri = encodeURIComponent(getBaseUrl());
      window.location.href = `${cognitoDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${logoutUri}`;
    }
  };

  const signOutLocal = async () => {
    try {
      // Only clear local session, don't redirect to Cognito
      await auth.removeUser();
      // Redirect to home page after local sign out
      window.location.href = "/";
    } catch (error) {
      console.error("Error during local sign out:", error);
      // Force redirect to home even if cleanup fails
      window.location.href = "/";
    }
  };

  const signOutComplete = async () => {
    try {
      // Clear local session first
      await auth.removeUser();
      
      // Clear only auth-related local storage items
      clearAuthStorage();
      
      // Then redirect to Cognito logout
      const logoutUri = encodeURIComponent(getBaseUrl());
      
      const logoutUrl = `${cognitoDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${logoutUri}`;
      
      // Force a complete page reload after logout
      setTimeout(() => {
        window.location.replace(logoutUrl);
      }, 100);
    } catch (error) {
      console.error("Error during complete sign out:", error);
      // Fallback: clear auth storage only and redirect
      clearAuthStorage();
      window.location.replace("/");
    }
  };

  const signUpRedirect = () => {
    window.location.href = buildAuthUrl("signUp");
  };

  const forgotPasswordRedirect = () => {
    window.location.href = buildAuthUrl("forgotPassword");
  };

  const mfaSetupRedirect = () => {
    const redirectUri = encodeURIComponent(`${getBaseUrl()}/profile`);
    
    window.location.href = `${cognitoDomain}/login?client_id=${cognitoAuthConfig.client_id}&response_type=code&scope=openid+email+phone+profile&redirect_uri=${redirectUri}&prompt=login`;
  };

  /**
   * Returns user profile information only — tokens are intentionally excluded
   * to prevent accidental exposure through the UI or logging.
   */
  const getUserInfo = () => {
    if (!auth.isAuthenticated || !auth.user) return null;
    
    return {
      email: auth.user.profile.email,
      name: auth.user.profile.name,
      sub: auth.user.profile.sub,
      phone: auth.user.profile.phone_number,
      emailVerified: auth.user.profile.email_verified,
      phoneVerified: auth.user.profile.phone_number_verified,
      mfaEnabled: auth.user.profile["cognito:mfa_enabled"],
      profile: auth.user.profile,
    };
  };

  /**
   * Get the access token for making authenticated API calls.
   * This should only be used inside API call functions, never rendered in the UI.
   */
  const getAccessToken = (): string | undefined => {
    return auth.user?.access_token;
  };

  const hasRequiredScopes = (requiredScopes: string[]) => {
    if (!auth.user?.scope) return false;
    const userScopes = auth.user.scope.split(' ');
    return requiredScopes.every(scope => userScopes.includes(scope));
  };

  return {
    ...auth,
    signOutRedirect, // Complete sign out (local + Cognito)
    signOutLocal, // Local sign out only
    signOutComplete, // Enhanced complete sign out
    removeUser: signOutLocal, // Alias for backward compatibility
    signUpRedirect,
    forgotPasswordRedirect,
    mfaSetupRedirect,
    getUserInfo,
    getAccessToken,
    hasRequiredScopes,
    isReady: !auth.isLoading && !auth.error,
  };
}