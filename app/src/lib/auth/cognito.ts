import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  CognitoUserAttribute,
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

export type NewPasswordChallenge = {
  type: "NEW_PASSWORD_REQUIRED";
  user: CognitoUser;
  userAttributes: Record<string, string>;
  requiredAttributes: string[];
};

type SignInSuccess = {
  type: "SUCCESS";
  session: CognitoUserSession;
};

export type SignInResult = SignInSuccess | NewPasswordChallenge;

type CompleteNewPasswordInput = {
  user: CognitoUser;
  newPassword: string;
  userAttributes: Record<string, string>;
  requiredAttributes: string[];
  requiredAttributeValues: Record<string, string>;
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

const toStringAttributes = (attributes: unknown): Record<string, string> => {
  if (!attributes || typeof attributes !== "object") {
    return {};
  }

  const record: Record<string, string> = {};
  Object.entries(attributes as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === "string") {
      record[key] = value;
    }
  });

  return record;
};

const stripReadOnlyAttributes = (attributes: Record<string, string>): Record<string, string> => {
  const trimmed = { ...attributes };
  delete trimmed.email_verified;
  delete trimmed.phone_number_verified;
  delete trimmed.sub;
  return trimmed;
};

const buildNewPasswordAttributes = (
  userAttributes: Record<string, string>,
  requiredAttributes: string[],
  requiredAttributeValues: Record<string, string>,
): Record<string, string> => {
  const sanitized = stripReadOnlyAttributes(userAttributes);
  const requiredOnly: Record<string, string> = {};

  requiredAttributes.forEach((attribute) => {
    const value = requiredAttributeValues[attribute] ?? sanitized[attribute];
    if (typeof value === "string" && value.length > 0) {
      requiredOnly[attribute] = value;
    }
  });

  return requiredOnly;
};

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

const getSessionFromStorage = async (storage: Storage, config: CognitoConfig): Promise<CognitoUserSession | null> => {
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

export const signInWithPassword = async (input: SignInInput): Promise<SignInResult> => {
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

  const result = await new Promise<SignInResult>((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve({ type: "SUCCESS", session }),
      onFailure: (error) => reject(error),
      newPasswordRequired: (userAttributes, requiredAttributes) =>
        resolve({
          type: "NEW_PASSWORD_REQUIRED",
          user,
          userAttributes: toStringAttributes(userAttributes),
          requiredAttributes: Array.isArray(requiredAttributes) ? requiredAttributes : [],
        }),
      mfaRequired: () => reject(withCode("MFA_REQUIRED")),
      totpRequired: () => reject(withCode("TOTP_REQUIRED")),
      selectMFAType: () => reject(withCode("SELECT_MFA_TYPE")),
      customChallenge: () => reject(withCode("CUSTOM_CHALLENGE")),
    });
  });

  if (result.type === "SUCCESS" && typeof window !== "undefined") {
    const otherStorage = input.remember ? window.sessionStorage : window.localStorage;
    clearCognitoStorage(otherStorage, config.clientId);
  }

  return result;
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

export const completeNewPasswordChallenge = async (input: CompleteNewPasswordInput): Promise<CognitoUserSession> => {
  const config = requireConfig();
  const attributes = buildNewPasswordAttributes(
    input.userAttributes,
    input.requiredAttributes,
    input.requiredAttributeValues,
  );

  const session = await new Promise<CognitoUserSession>((resolve, reject) => {
    input.user.completeNewPasswordChallenge(input.newPassword, attributes, {
      onSuccess: (result) => resolve(result),
      onFailure: (error) => reject(error),
    });
  });

  if (typeof window !== "undefined") {
    const otherStorage = getBrowserStorage(!input.remember);
    clearCognitoStorage(otherStorage, config.clientId);
  }

  return session;
};

export const signOut = (): void => {
  const config = getConfig();
  if (!config || typeof window === "undefined") {
    return;
  }

  const storages = [window.localStorage, window.sessionStorage];
  storages.forEach((storage) => {
    const pool = createUserPool(config, storage);
    const user = pool.getCurrentUser();
    if (user) {
      user.signOut();
    }
    clearCognitoStorage(storage, config.clientId);
  });
};

export const getIdTokenJwt = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }
  return session.getIdToken().getJwtToken();
};

export type MyProfile = {
  userName: string;
  departmentName: string;
};

export const getMyProfile = async (): Promise<MyProfile | null> => {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const payload = session.getIdToken().decodePayload() as Record<string, unknown>;

  // userName は好きな属性に寄せてOK（例: custom:displayName）
  const userName = (payload["custom:displayName"] as string | undefined) ?? "";

  const departmentName = (payload["custom:departmentName"] as string | undefined) ?? "";

  return { userName, departmentName };
};

// 認証済み user + session を「同じストレージ」から確実に取得する
const getAuthenticatedUserAndSession = async (): Promise<{ user: CognitoUser; session: CognitoUserSession } | null> => {
  const config = getConfig();
  if (!config || typeof window === "undefined") {
    return null;
  }

  const storages = [window.localStorage, window.sessionStorage] as const;

  for (const storage of storages) {
    const pool = createUserPool(config, storage);
    const user = pool.getCurrentUser();
    if (!user) {
      continue;
    }

    const session = await new Promise<CognitoUserSession | null>((resolve) => {
      user.getSession((err: Error | null, s: CognitoUserSession | null) => {
        if (err || !s) {
          return resolve(null);
        }
        resolve(s);
      });
    });

    if (session) {
      return { user, session };
    }
  }

  return null;
};

export const updateMyProfileAttributes = async (input: {
  userName?: string; // custom:displayName
  departmentName?: string; // custom:departmentName
}): Promise<CognitoUserSession> => {
  const found = await getAuthenticatedUserAndSession();
  if (!found) {
    throw withCode("NOT_AUTHENTICATED");
  }

  const { user, session } = found;

  const attrs: CognitoUserAttribute[] = [];
  if (typeof input.userName === "string") {
    attrs.push(new CognitoUserAttribute({ Name: "custom:displayName", Value: input.userName }));
  }
  if (typeof input.departmentName === "string") {
    attrs.push(new CognitoUserAttribute({ Name: "custom:departmentName", Value: input.departmentName }));
  }
  if (attrs.length === 0) {
    throw withCode("NO_FIELDS_TO_UPDATE");
  }

  // 1) 属性更新（この時点で session がある user なので "not authenticated" が起きにくい）
  await new Promise<void>((resolve, reject) => {
    user.updateAttributes(attrs, (err) => (err ? reject(err) : resolve()));
  });

  // 2) トークン再発行（ヘッダー即反映のため）
  const refreshToken = session.getRefreshToken();
  const refreshed = await new Promise<CognitoUserSession>((resolve, reject) => {
    user.refreshSession(refreshToken, (err: Error | null, newSession: CognitoUserSession | null) => {
      if (err || !newSession) {
        return reject(err ?? withCode("REFRESH_FAILED"));
      }
      resolve(newSession);
    });
  });

  return refreshed;
};

const createUnauthenticatedUser = (identifier: string, storage: Storage): CognitoUser => {
  const config = requireConfig();
  const pool = createUserPool(config, storage);
  const username = identifier.trim();

  return new CognitoUser({
    Username: username,
    Pool: pool,
    Storage: storage,
  });
};

export const confirmPasswordReset = async (input: {
  identifier: string;
  verificationCode: string;
  newPassword: string;
}): Promise<void> => {
  const identifier = input.identifier.trim();
  const code = input.verificationCode.trim();
  if (!identifier || !code || !input.newPassword) {
    throw withCode("InvalidParameterException");
  }

  const storage = getBrowserStorage(false);
  const user = createUnauthenticatedUser(identifier, storage);

  await new Promise<void>((resolve, reject) => {
    user.confirmPassword(code, input.newPassword, {
      onSuccess: () => resolve(),
      onFailure: (error) => reject(error),
    });
  });
};

export type ForgotPasswordDelivery = {
  destination?: string;
  deliveryMedium?: string;
  attributeName?: string;
};

export const requestPasswordReset = async (identifier: string): Promise<ForgotPasswordDelivery> => {
  if (!identifier.trim()) {
    throw withCode("InvalidParameterException");
  }

  // パスワード再設定はログイン不要なので sessionStorage を使う
  const storage = getBrowserStorage(false);
  const user = createUnauthenticatedUser(identifier, storage);

  return new Promise<ForgotPasswordDelivery>((resolve, reject) => {
    let resolved = false;
    user.forgotPassword({
      onFailure: (error) => reject(error),
      inputVerificationCode: (data) => {
        if (resolved) {
          return;
        }
        resolved = true;
        const payload = (data ?? {}) as Record<string, unknown>;
        resolve({
          destination: typeof payload.Destination === "string" ? payload.Destination : undefined,
          deliveryMedium: typeof payload.DeliveryMedium === "string" ? payload.DeliveryMedium : undefined,
          attributeName: typeof payload.AttributeName === "string" ? payload.AttributeName : undefined,
        });
      },
      onSuccess: () => {
        // confirmPassword を使わずに完結させる場合に備えて一応 resolve
        if (resolved) {
          return;
        }
        resolved = true;
        resolve({});
      },
    });
  });
};
