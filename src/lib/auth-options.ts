import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { getUserByEmail } from '@/lib/firestore';
import {
  hydrateSessionUserFromToken,
  withPendingRoleSelectionTokenFor,
  withPersistedUserTokenFor,
} from '@/lib/auth-session-utils';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await getUserByEmail(user.email!);

          if (!existingUser) {
            return true;
          }

          return true;
        } catch (error) {
          console.error('Error during sign in:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        const dbUser = await getUserByEmail(user.email!);

        if (dbUser) {
          return withPersistedUserTokenFor(token, dbUser);
        } else {
          return withPendingRoleSelectionTokenFor(token, user);
        }
      } else if (token.needsRoleSelection && token.email) {
        const dbUser = await getUserByEmail(token.email as string);
        if (dbUser) {
          return withPersistedUserTokenFor(token, dbUser);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user = hydrateSessionUserFromToken(session.user, token);
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
