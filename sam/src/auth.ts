import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export function getTenantId(user: AuthenticatedUser): string | null {
  const tenantId = user['tenantId'];

  if (tenantId) {
    console.log(`Found tenant ID in token: ${tenantId}`);
    return tenantId;
  }

  console.warn('Tenant ID not found in token');
  return null;
}

export function hasPermission(user: AuthenticatedUser, requiredPermission: string): boolean {
  const userPermissions = user.permissions || [];
  const has = userPermissions.includes(requiredPermission);

  console.log(`Checking permission "${requiredPermission}": ${has ? '✅ granted' : '❌ denied'}`);
  return has;
}


const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN; // e.g. 'your-tenant.auth0.com'
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE; // e.g. 'https://your-api/'

// Setup JWKS client
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
});

// Dynamically get signing key for RS256 tokens
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

interface AuthenticatedUser {
  sub: string;
  permissions?: string[];
  [claim: string]: any;
}

export function authenticate(token: string): Promise<AuthenticatedUser | null> {
  return new Promise((resolve) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          console.error('JWT verification failed:', err);
          resolve(null);
        } else {
          resolve(decoded as AuthenticatedUser);
        }
      }
    );
  });
}
