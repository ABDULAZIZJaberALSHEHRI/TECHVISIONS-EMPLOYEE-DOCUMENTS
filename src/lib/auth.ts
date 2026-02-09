import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      department: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    department: string | null;
  }
}

const providers: NextAuthOptions["providers"] = [
  AzureADProvider({
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    tenantId: process.env.AZURE_AD_TENANT_ID!,
    authorization: {
      params: {
        scope: "openid profile email User.Read",
      },
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username,
        email: profile.email || profile.preferred_username,
        image: null,
      };
    },
  }),
];

// Dev-only credentials provider for local testing
if (process.env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.isActive) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false;

      // Dev credentials provider — user already validated in authorize()
      if (account.provider === "dev-credentials") {
        return true;
      }

      if (!profile) return false;

      try {
        const azureAdId =
          (profile as Record<string, string>).oid ||
          (profile as Record<string, string>).sub ||
          account.providerAccountId;

        const email = user.email;
        if (!email) return false;

        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ azureAdId }, { email }],
          },
        });

        if (existingUser) {
          if (!existingUser.isActive) return false;

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              azureAdId,
              name: user.name || existingUser.name,
              lastLoginAt: new Date(),
              avatarUrl: user.image || existingUser.avatarUrl,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              azureAdId,
              email,
              name: user.name || email.split("@")[0],
              department:
                (profile as Record<string, string>).department || null,
              jobTitle:
                (profile as Record<string, string>).jobTitle || null,
              role: "EMPLOYEE",
              isActive: true,
              avatarUrl: user.image || null,
              lastLoginAt: new Date(),
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      // Dev credentials provider — look up by user id directly
      if (account?.provider === "dev-credentials" && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, department: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.department = dbUser.department;
        }
        return token;
      }

      if (account && profile) {
        const azureAdId =
          (profile as Record<string, string>).oid ||
          (profile as Record<string, string>).sub ||
          account.providerAccountId;

        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ azureAdId }, { email: token.email! }],
          },
          select: {
            id: true,
            role: true,
            department: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.department = dbUser.department;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.department = token.department;
      }
      return session;
    },
  },
};
