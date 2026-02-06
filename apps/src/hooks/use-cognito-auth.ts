"use client";

import { useAuth} from "react-oidc-context";
import {
  cognitoConfig,
  buildAuthUrl,
  buildLogoutUrl,
} from '../config/cognito';

export function useCognitoAuth() {
  const auth = useAuth();

  const signOutRedirect = async () => {
    try {
      // First, clear the local session
      await auth.removeUser();
      
      // Then redirect to Cognito logout to clear server-side session
     const clientId = cognitoConfig.clientId;

      const logoutUri = encodeURIComponent(window.location.origin);
      
      // Use the proper Cognito logout URL
      const logoutUrl = buildLogoutUrl(window.location.origin);

      
      // Small delay to ensure local cleanup completes
      setTimeout(() => {
        window.location.href = logoutUrl;
      }, 100);
    } catch (error) {
      console.error("Error during sign out:", error);
      // Fallback: force redirect to logout even if local cleanup fails
      const clientId = cognitoConfig.clientId;
      const logoutUri = encodeURIComponent(window.location.origin);
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
      
      // Clear any additional local storage items
      localStorage.removeItem(cognitoConfig.clientId
);
      sessionStorage.clear();
      
      // Then redirect to Cognito logout
      const clientId = cognitoConfig.clientId;
      const logoutUri = encodeURIComponent(window.location.origin);
      
      const logoutUrl = buildLogoutUrl(window.location.origin);

      
      // Force a complete page reload after logout
      setTimeout(() => {
        window.location.replace(logoutUrl);
      }, 100);
    } catch (error) {
      console.error("Error during complete sign out:", error);
      // Fallback: clear everything and redirect
      localStorage.clear();
      sessionStorage.clear();
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
    // Cognito doesn't have a direct MFA setup URL, so we redirect to the user settings
    // where users can manage their MFA settings
    const clientId = cognitoConfig.clientId;

    const redirectUri = encodeURIComponent(`${window.location.origin}/profile`);
    
    // Redirect to Cognito hosted UI with a prompt to manage account settings
    // This will allow users to set up MFA through Cognito's interface
  };

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
      idToken: auth.user.id_token,
      accessToken: auth.user.access_token,
      refreshToken: auth.user.refresh_token,
    };
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
    hasRequiredScopes,
    isReady: !auth.isLoading && !auth.error,
  };
}