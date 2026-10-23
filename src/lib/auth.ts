import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { verifyCredentials } from "./credentials"
import { LoginLimited } from "./loginLimit"
import { TOO_MANY_ATTEMPTS } from "./signInCodes"

/** A CredentialsSignin's code reaches the browser, so the form can say "wait" rather than "wrong password" */
class TooManyAttempts extends CredentialsSignin {
    code = TOO_MANY_ATTEMPTS
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            async authorize(credentials, request) {
                try {
                    return await verifyCredentials(credentials, request)
                } catch (error) {
                    if (error instanceof LoginLimited) throw new TooManyAttempts()
                    throw error
                }
            },
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