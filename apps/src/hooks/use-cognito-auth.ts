"use client";

import { useAuth } from "react-oidc-context";
import { cognitoDomain, buildAuthUrl } from "../lib/auth-config";

export function useCognitoAuth() {
  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = "7mqmc57sb18ideegj293pk81ib";
    const logoutUri = "http://localhost:3001";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const signUpRedirect = () => {
    window.location.href = buildAuthUrl("signUp");
  };

  const forgotPasswordRedirect = () => {
    window.location.href = buildAuthUrl("forgotPassword");
  };

  const mfaSetupRedirect = () => {
    window.location.href = buildAuthUrl("mfa");
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
    };
  };

  const hasRequiredScopes = (requiredScopes: string[]) => {
    if (!auth.user?.scope) return false;
    const userScopes = auth.user.scope.split(' ');
    return requiredScopes.every(scope => userScopes.includes(scope));
  };

  return {
    ...auth,
    signOutRedirect,
    signUpRedirect,
    forgotPasswordRedirect,
    mfaSetupRedirect,
    getUserInfo,
    hasRequiredScopes,
    isReady: !auth.isLoading && !auth.error,
  };
}