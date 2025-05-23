import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      avatar?: string;
      needsRoleSelection?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    avatar?: string;
    needsRoleSelection?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    avatar?: string;
    needsRoleSelection?: boolean;
  }
} 