import { createRemoteJWKSet, jwtVerify } from "jose";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

// issuer -> jwks の簡易キャッシュ
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(issuer: string) {
  const cached = jwksCache.get(issuer);
  if (cached) {
    return cached;
  }
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  jwksCache.set(issuer, jwks);
  return jwks;
}

export async function verifyCognitoIdToken(idToken: string) {
  const region = requireEnv("AWS_REGION");
  const userPoolId = requireEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID");
  const clientId = requireEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID");

  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwks = getJwks(issuer);

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: clientId, // ID token の aud は client id
  });
  return payload;
}
