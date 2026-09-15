import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
// MongoDBAdapter removed - using JWT strategy with manual user management
import clientPromise from "../../../../lib/mongodb";

export const authOptions: NextAuthOptions = {
  debug: true,
  // adapter removed to prevent conflict with JWT strategy + OAuth
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        fullName: { label: "Full Name", type: "text" },
        location: { label: "Location", type: "text" },
        isSignUp: { label: "Is SignUp", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;
        const isSignUp = credentials.isSignUp === "true";
        const fullName = credentials.fullName?.trim() || "";
        const location = credentials.location?.trim() || "";

        const client = await clientPromise;
        const db = client.db();
        let user = await db.collection("users").findOne({ email });

        if (isSignUp) {
          if (user) {
            throw new Error("User with this email already exists.");
          }
          const newUser = {
            name: fullName || email.split("@")[0],
            email: email,
            password: password,
            location: location,
            role: null,
            profileComplete: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const result = await db.collection("users").insertOne(newUser);
          return {
            id: result.insertedId.toString(),
            name: newUser.name,
            email: newUser.email,
            role: null,
            profileComplete: false,
          };
        } else {
          if (!user) {
            const newUser = {
              name: fullName || email.split("@")[0],
              email: email,
              password: password,
              location: location,
              role: null,
              profileComplete: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const result = await db.collection("users").insertOne(newUser);
            return {
              id: result.insertedId.toString(),
              name: newUser.name,
              email: newUser.email,
              role: null,
              profileComplete: false,
            };
          }

          if (user.password && user.password !== password) {
            throw new Error("Invalid password.");
          }

          if (!user.password) {
            await db.collection("users").updateOne(
              { _id: user._id },
              { $set: { password: password } }
            );
          }

          return {
            id: user._id.toString(),
            name: user.name || fullName || email.split("@")[0],
            email: user.email,
            role: user.role || null,
            profileComplete: user.profileComplete || false,
          };
        }
      },
    }),
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db();

          // Upsert the user — create if not exists, update image/name if exists
          await db.collection("users").updateOne(
            { email: user.email },
            {
              $set: {
                name: user.name || profile?.name || user.email?.split("@")[0],
                email: user.email,
                image: user.image || (profile as any)?.picture || null,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                role: null,
                profileComplete: false,
                emailVerified: new Date(),
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          // Still allow sign-in even if DB write fails
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.sub = user.id || token.sub;
        const client = await clientPromise;
        const db = client.db();
        const dbUser = await db.collection("users").findOne({ email: user.email });
        if (dbUser) {
          token.role = dbUser.role || null;
          token.profileComplete = dbUser.profileComplete || false;
          if (dbUser.name) token.name = dbUser.name;
        } else {
          token.role = (user as any).role || null;
          token.profileComplete = (user as any).profileComplete || false;
        }
      }
      if (trigger === "update" && session) {
        if (session.role !== undefined) token.role = session.role;
        if (session.profileComplete !== undefined) token.profileComplete = session.profileComplete;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
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
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
