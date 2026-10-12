import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { verifyCredentials } from "./credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            authorize: verifyCredentials,
        }),
    ],
    callbacks: {
        jwt({ token, user }) {
            if (user) token.id = user.id
            return token
        },
        session({ session, token }) {
            if (token.id) session.user.id = token.id as string
            return session
        },
    },
})