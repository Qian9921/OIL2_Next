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
      console.log("SignIn callback - User:", user?.email, "Provider:", account?.provider);
      if (account?.provider === "google") {
        try {
          // Check if user exists in our database
          const existingUser = await getUserByEmail(user.email!);
          console.log("Existing user found:", !!existingUser);
          
          if (!existingUser) {
            console.log("New user - will show role selection");
            // New user - we'll need to handle role selection
            // For now, we'll create a temporary user record
            // The role will be set during the signup process
            return true;
          }
          
          console.log("Existing user - direct login");
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, account }) {
      console.log("JWT callback - Account:", !!account, "User:", user?.email);
      
      if (account && user) {
        console.log("Fresh login, checking user in database...");
        // Check if user exists in our database
        const dbUser = await getUserByEmail(user.email!);
        console.log("Database user:", dbUser?.email, "Role:", dbUser?.role);
        
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.avatar = dbUser.avatar;
          token.needsRoleSelection = false;
          console.log("Set token for existing user, role:", dbUser.role);
        } else {
          // New user - store basic info in token
          token.email = user.email;
          token.name = user.name;
          token.needsRoleSelection = true;
          console.log("Set token for new user, needs role selection");
        }
      } else {
        // Subsequent requests - check if user was created in the meantime
        if (token.needsRoleSelection && token.email) {
          console.log("Checking if user was created since last check...");
          const dbUser = await getUserByEmail(token.email as string);
          if (dbUser) {
            console.log("User found! Updating token with role:", dbUser.role);
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
      console.log("Session callback - Token role:", token.role, "Needs role:", token.needsRoleSelection);
      
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string;
        session.user.needsRoleSelection = token.needsRoleSelection as boolean;
        
        console.log("Final session - Role:", session.user.role, "Needs role:", session.user.needsRoleSelection);
      }
      
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 