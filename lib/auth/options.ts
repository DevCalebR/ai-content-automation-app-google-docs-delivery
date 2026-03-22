import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { authorizeCredentials } from "@/lib/auth/credentials";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;

      if (!userId) {
        return token;
      }

      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          emailVerified: true,
          updatedAt: true,
        },
      });

      if (!currentUser?.emailVerified) {
        return {};
      }

      if (user?.id) {
        token.sub = userId;
        token.authVersion = currentUser.updatedAt.getTime();
        return token;
      }

      const authVersion =
        typeof token.authVersion === "number" ? token.authVersion : undefined;

      if (!authVersion || currentUser.updatedAt.getTime() !== authVersion) {
        return {};
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.sub || !session.user) {
        return {
          expires: session.expires,
        };
      }

      if (session.user) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};
