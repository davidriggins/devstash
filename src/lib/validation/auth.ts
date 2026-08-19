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
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

/**
 * The rule for a password being *set*, as opposed to one being offered at
 * sign-in. Registration and password reset share it so the two can never drift
 * into accepting different passwords.
 */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  );

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

/**
 * Changing a password from inside the account, which is not the same as
 * resetting a forgotten one: the current password stands in for the emailed
 * link as proof, so that an unlocked screen someone walked away from cannot be
 * turned into a stolen account.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Your new password must be different from the current one",
    path: ["newPassword"],
  });

/**
 * The token rides in the request body rather than being read from the URL on
 * the server, because the reset page hands it to the form and the form is what
 * submits it. It is still checked against the database, so an empty or made-up
 * value fails there too — this only saves a round trip.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
