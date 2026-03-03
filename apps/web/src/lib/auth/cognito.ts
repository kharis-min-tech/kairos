import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const POOL_CONFIG = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'eu-west-2_pcXtxTuhu',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '51g4egqn15ukgho80mbgsdi5r3',
};

const userPool = new CognitoUserPool(POOL_CONFIG);

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  branchId: string;
}

function extractUser(session: CognitoUserSession): AuthUser {
  const idToken = session.getIdToken();
  const payload = idToken.decodePayload();
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload['custom:role'] || 'Member',
    branchId: payload['custom:branchId'] || '',
  };
}

export function signIn(email: string, password: string): Promise<{ user: AuthUser; session: CognitoUserSession; requiresNewPassword?: boolean; cognitoUser?: CognitoUser }> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({ user: extractUser(session), session });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: (_userAttributes) => {
        // Return a special response indicating password change is needed
        reject({ code: 'NEW_PASSWORD_REQUIRED', cognitoUser });
      },
    });
  });
}

export function signOut(): Promise<void> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut(() => resolve());
    } else {
      resolve();
    }
  });
}

export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
}

export function getIdToken(): Promise<string | null> {
  return getCurrentSession().then((session) => {
    if (!session) return null;
    return session.getIdToken().getJwtToken();
  });
}

export function refreshSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }
      const refreshToken = session.getRefreshToken();
      cognitoUser.refreshSession(refreshToken, (refreshErr: Error | null, newSession: CognitoUserSession) => {
        if (refreshErr) {
          resolve(null);
          return;
        }
        resolve(newSession);
      });
    });
  });
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
      inputVerificationCode: () => resolve(),
    });
  });
}

export function confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function completeNewPasswordChallenge(
  cognitoUser: CognitoUser,
  newPassword: string,
  requiredAttributes: Record<string, string> = {}
): Promise<{ user: AuthUser; session: CognitoUserSession }> {
  return new Promise((resolve, reject) => {
    // Cognito requires 'name' attribute - provide a default if not specified
    const attributes = {
      name: 'User',
      ...requiredAttributes,
    };
    
    cognitoUser.completeNewPasswordChallenge(newPassword, attributes, {
      onSuccess: (session) => {
        resolve({ user: extractUser(session), session });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

export { extractUser, userPool };
