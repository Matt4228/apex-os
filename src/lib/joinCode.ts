import { randomInt } from "node:crypto"

/** Letters and digits that can't be mistaken for each other when read aloud or typed: no 0/O, 1/I/L */
export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
export const JOIN_CODE_LENGTH = 10

/** A random code for a competition's invite link, from a cryptographic random source */
export function newJoinCode(): string {
    return Array.from({ length: JOIN_CODE_LENGTH }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("")
}

/** Could this be a join code? Checked before any database lookup */
export const looksLikeJoinCode = (code: string) => new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`).test(code)
