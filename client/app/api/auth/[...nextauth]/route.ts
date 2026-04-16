import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "../../../../lib/mongodb";

const handler = NextAuth({
  debug: true,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On first sign-in, pull role from DB user record
      if (user) {
        const client = await clientPromise;
        const db = client.db();
        const dbUser = await db.collection("users").findOne({ email: user.email });
        token.role = dbUser?.role || null;
        token.profileComplete = dbUser?.profileComplete || false;
      }
      // When session is updated from client (e.g. after role selection)
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role;
        if (session.profileComplete !== undefined) token.profileComplete = session.profileComplete;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        // @ts-ignore
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = token.role || null;
        // @ts-ignore
        session.user.profileComplete = token.profileComplete || false;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
