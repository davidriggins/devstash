import { z } from "zod";

/**
 * Shared shapes for the credentials flow. The register route and the
 * `authorize` callback both parse untrusted input, so the rules live here
 * rather than being restated at each call site.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Normalizes before validating, so a pasted " Me@Example.com " is accepted and
 * stored the same way it will later be typed at sign-in. The order matters:
 * `z.email()` carries its format check at the base, so trimming after it would
 * never run on input the check has already rejected.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: emailSchema,
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
