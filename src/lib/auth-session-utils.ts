import { User } from "./types";
import { getEffectiveUserRole } from "./role-routing";

export interface AuthTokenLike {
  email?: string | null;
  name?: string | null;
  userId?: string;
  role?: string;
  avatar?: string;
  needsRoleSelection?: boolean;
}

export interface AuthUserLike {
  email?: string | null;
  name?: string | null;
}

export interface SessionUserLike {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  avatar?: string;
  needsRoleSelection?: boolean;
}

type PersistedUserLike = Pick<User, "id" | "role" | "name" | "avatar">;

export function withPersistedUserToken(
  token: AuthTokenLike,
  dbUser: PersistedUserLike,
): AuthTokenLike {
  return {
    ...token,
    userId: dbUser.id,
    role: getEffectiveUserRole(dbUser.role) ?? dbUser.role,
    name: dbUser.name,
    avatar: dbUser.avatar,
    needsRoleSelection: false,
  };
}

export function withPendingRoleSelectionToken(
  token: AuthTokenLike,
  user: AuthUserLike,
): AuthTokenLike {
  return {
    ...token,
    email: user.email ?? token.email,
    name: user.name ?? token.name,
    needsRoleSelection: true,
  };
}

export function withPersistedUserTokenFor<T extends AuthTokenLike>(
  token: T,
  dbUser: PersistedUserLike,
): T {
  return withPersistedUserToken(token, dbUser) as T;
}

export function withPendingRoleSelectionTokenFor<T extends AuthTokenLike>(
  token: T,
  user: AuthUserLike,
): T {
  return withPendingRoleSelectionToken(token, user) as T;
}

export function hydrateSessionUserFromToken<T extends SessionUserLike>(
  sessionUser: T,
  token: AuthTokenLike,
): T {
  return {
    ...sessionUser,
    id: token.userId ?? sessionUser.id,
    role: token.role,
    avatar: token.avatar,
    needsRoleSelection: token.needsRoleSelection,
  } as T;
}
