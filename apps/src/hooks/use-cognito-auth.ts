"use client";

import { useAuth } from "react-oidc-context";
import { cognitoDomain, buildAuthUrl } from "../lib/auth-config";

export function useCognitoAuth() {
  const auth = useAuth();

  const signOutRedirect = async () => {
    try {
      // First, clear the local session
      await auth.removeUser();
      
      // Then redirect to Cognito logout to clear server-side session
      const clientId = "7mqmc57sb18ideegj293pk81ib";
      const logoutUri = encodeURIComponent("http://localhost:3001");
      
      // Use the proper Cognito logout URL
      const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
      
      // Small delay to ensure local cleanup completes
      setTimeout(() => {
        window.location.href = logoutUrl;
      }, 100);
    } catch (error) {
      console.error("Error during sign out:", error);
      // Fallback: force redirect to logout even if local cleanup fails
      const clientId = "7mqmc57sb18ideegj293pk81ib";
      const logoutUri = encodeURIComponent("http://localhost:3001");
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
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
      localStorage.removeItem("oidc.user:https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK:7mqmc57sb18ideegj293pk81ib");
      sessionStorage.clear();
      
      // Then redirect to Cognito logout
      const clientId = "7mqmc57sb18ideegj293pk81ib";
      const logoutUri = encodeURIComponent("http://localhost:3001");
      
      const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
      
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
    const clientId = "7mqmc57sb18ideegj293pk81ib";
    const redirectUri = encodeURIComponent("http://localhost:3001/profile");
    
    // Redirect to Cognito hosted UI with a prompt to manage account settings
    // This will allow users to set up MFA through Cognito's interface
    window.location.href = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=openid+email+phone+profile&redirect_uri=${redirectUri}&prompt=login`;
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