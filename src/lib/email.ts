import { z } from "zod"

/** An email address, trimmed and lowercased, so "Matt@Example.com " and "matt@example.com" are the same account */
export const emailSchema = z.string({ error: "Enter a valid email address." }).trim().toLowerCase().email("Enter a valid email address.")