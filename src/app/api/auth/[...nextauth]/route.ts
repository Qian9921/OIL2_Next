import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail } from "@/lib/firestore";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await getUserByEmail(user.email!);

          if (!existingUser) {
            return true;
          }

          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (account && user) {
        const dbUser = await getUserByEmail(user.email!);

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.avatar = dbUser.avatar;
          token.needsRoleSelection = false;
        } else {
          token.email = user.email;
          token.name = user.name;
          token.needsRoleSelection = true;
        }
      } else {
        if (token.needsRoleSelection && token.email) {
          const dbUser = await getUserByEmail(token.email as string);
          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.avatar = dbUser.avatar;
            token.needsRoleSelection = false;
          }
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string;
        session.user.needsRoleSelection = token.needsRoleSelection as boolean;
      }
      
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 
