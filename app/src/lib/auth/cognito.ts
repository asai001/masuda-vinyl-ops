import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

type CognitoConfig = {
  userPoolId: string;
  clientId: string;
};

type SignInInput = {
  identifier: string;
  password: string;
  remember: boolean;
};

type AuthError = Error & { code?: string };

const getConfig = (): CognitoConfig | null => {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    return null;
  }

  return { userPoolId, clientId };
};

const withCode = (code: string): AuthError => {
  const error = new Error(code) as AuthError;
  error.code = code;
  return error;
};

const requireConfig = (): CognitoConfig => {
  const config = getConfig();
  if (!config) {
    throw withCode("CONFIG_MISSING");
  }
  return config;
};

const getBrowserStorage = (remember: boolean): Storage => {
  if (typeof window === "undefined") {
    throw withCode("STORAGE_UNAVAILABLE");
  }
  return remember ? window.localStorage : window.sessionStorage;
};

const createUserPool = (config: CognitoConfig, storage: Storage): CognitoUserPool =>
  new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
    Storage: storage,
  });

const clearCognitoStorage = (storage: Storage, clientId: string) => {
  const prefix = `CognitoIdentityServiceProvider.${clientId}`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
};

const getSessionFromStorage = async (
  storage: Storage,
  config: CognitoConfig,
): Promise<CognitoUserSession | null> => {
  const pool = createUserPool(config, storage);
  const user = pool.getCurrentUser();
  if (!user) {
    return null;
  }

  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
};

export const signInWithPassword = async (input: SignInInput): Promise<CognitoUserSession> => {
  const config = requireConfig();
  const storage = getBrowserStorage(input.remember);
  const pool = createUserPool(config, storage);
  const username = input.identifier.trim();

  const user = new CognitoUser({
    Username: username,
    Pool: pool,
    Storage: storage,
  });

  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: input.password,
  });

  const session = await new Promise<CognitoUserSession>((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (result) => resolve(result),
      onFailure: (error) => reject(error),
      newPasswordRequired: () => reject(withCode("NEW_PASSWORD_REQUIRED")),
      mfaRequired: () => reject(withCode("MFA_REQUIRED")),
      totpRequired: () => reject(withCode("TOTP_REQUIRED")),
      selectMFAType: () => reject(withCode("SELECT_MFA_TYPE")),
      customChallenge: () => reject(withCode("CUSTOM_CHALLENGE")),
    });
  });

  if (typeof window !== "undefined") {
    const otherStorage = input.remember ? window.sessionStorage : window.localStorage;
    clearCognitoStorage(otherStorage, config.clientId);
  }

  return session;
};

export const getCurrentSession = async (): Promise<CognitoUserSession | null> => {
  const config = getConfig();
  if (!config || typeof window === "undefined") {
    return null;
  }

  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    const session = await getSessionFromStorage(storage, config);
    if (session) {
      return session;
    }
  }

  return null;
};
