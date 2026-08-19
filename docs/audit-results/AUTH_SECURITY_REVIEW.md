# Auth Security Review

**Last audited:** 2026-08-19
**Scope:** `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/lib/auth/**`, `src/lib/email/**`, `src/lib/validation/auth.ts`, `src/lib/db/user.ts`, `src/lib/search-params.ts`, all seven routes under `src/app/api/auth/**`, the `(auth)` pages, `src/app/(app)/profile`, `src/actions/{auth,account}.ts`, `src/components/{auth,profile}/**`, and the `User` / `VerificationToken` models.
**Result:** 0 critical, 1 high, 2 medium, 1 low

---

## Findings

### 🟠 High — A password reset does not end the attacker's session

- **File:** `src/auth.ts:85`, `src/lib/auth/password-reset-token.ts:181-193`, `src/app/api/auth/change-password/route.ts:91-94`
- **Issue:** Sessions are stateless JWTs (`session: { strategy: "jwt" }`) with Auth.js's default 30-day `maxAge`. Neither the reset flow nor the change-password route records anything that would let an already-issued token be rejected, and a JWT cannot be revoked without server-side state. The new password is written; every previously issued cookie keeps working.
- **Exploit:** An attacker who has obtained a session cookie — shared machine, stolen backup, XSS elsewhere on the origin — keeps full authenticated access to the victim's account for up to 30 days after the victim notices and completes a password reset. Resetting the password is precisely the control a user reaches for on compromise, and against a stolen session it does nothing at all.
- **Why this outranks the other findings:** every other item makes an attack easier; this one makes the recovery ineffective after the attack has already succeeded. It also silently weakens the reset flow, which is otherwise the most carefully built part of this codebase.
- **Fix:** Add a revocation checkpoint. Migration adds `passwordChangedAt DateTime?` to `User`; stamp it in the same `$transaction` as the reset and in the change-password update, put the sign-in timestamp into the JWT, and reject stale tokens in the callback:

  ```ts
  // src/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.pwdAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return session;

      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true },
      });

      // Issued before the last password change — treat as signed out
      if (
        user?.passwordChangedAt &&
        typeof token.pwdAt === "number" &&
        token.pwdAt < user.passwordChangedAt.getTime()
      ) {
        throw new Error("Session revoked");
      }

      session.user.id = token.sub;
      return session;
    },
  }
  ```

  That costs one query per session read, which is the trade being made. If you would rather not pay it on every request, the cheaper partial fix is dropping `session.maxAge` from 30 days to something short (a few days) so the exposure window shrinks even though it does not close. Note the check belongs in the Node-runtime `auth.ts` callback, not `auth.config.ts` — the edge proxy cannot reach Prisma.

---

### 🟡 Medium — No rate limiting on any auth endpoint

- **File:** `src/actions/auth.ts:31`, `src/app/api/auth/change-password/route.ts:21`, `src/app/api/auth/forgot-password/route.ts:28`, `src/app/api/auth/resend-verification/route.ts:29`
- **Issue:** Grepping the whole of `src/` for any limiter, attempt counter, lockout or throttle returns nothing. Nothing counts failed sign-ins per account or per IP. The only per-request cost is bcrypt at cost 12.
- **Exploit:** An attacker with a known email address (harvested via the registration oracle below) posts the sign-in Server Action repeatedly with a password list. At roughly 250 ms per bcrypt comparison and with requests issued concurrently, a credential-stuffing run against the top few thousand passwords completes in minutes, and nothing in the app notices or slows down. An 8-character minimum with no strength or breach check (`passwordSchema`, `src/lib/validation/auth.ts:28`) is what that run is aimed at.
- **Second exploit, mail volume:** the cooldowns on `forgot-password` and `resend-verification` are keyed on the *address* (`hasRecentPasswordResetToken` / `hasRecentVerificationToken`), so they stop one inbox being buried but not an attacker cycling through many addresses. A script posting a different address each time sends unbounded mail through Resend, burning quota and putting the sending domain's reputation at risk.
- **Fix:** Put a limiter in front of the credential path first — that is where the account loss is. Sliding window keyed on both IP and normalized email, roughly 5 failures per 15 minutes per account and a looser per-IP cap, failures counted in `authorize` or in the action before `signIn`. `@upstash/ratelimit` with Vercel KV suits the serverless deployment; an in-memory `Map` will not, since it is per-instance. Add a per-IP cap on the two mail endpoints alongside the existing per-address cooldowns — keep both, they stop different things.

---

### 🟡 Medium — The registration endpoint answers "does this address have an account?"

- **File:** `src/app/api/auth/register/route.ts:50-55`
- **Issue:** A known address returns `409` with `"An account with that email already exists"`; an unknown one returns `201`. Every other endpoint in this codebase refuses that question deliberately and at some cost — `forgot-password` swallows errors into a generic `200` rather than let a status code differ (`src/app/api/auth/forgot-password/route.ts:72-78`), and `resend-verification` answers identically for unknown, verified and GitHub-only addresses. Registration hands the same fact over on a status code.
- **Exploit:** A script posts candidate addresses to `/api/auth/register` with a throwaway password and reads the status: `409` means that person has a DevStash account, `201` means they do not. With no rate limiting it runs at whatever rate the host allows, and the resulting list is the input for the credential-stuffing attack above.
- **Honest caveat:** this is a genuine trade-off rather than a clear-cut bug — telling someone "you already have an account" at signup is real UX value, and plenty of products accept the leak knowingly. It is reported because the rest of this codebase pays a visible price to close exactly this oracle, so the inconsistency looks unintended rather than chosen.
- **Fix:** Either accept it explicitly (a comment in the route saying so, so the next audit stops flagging it), or match the posture of the other endpoints: always return `201` with the generic "check your email" copy, and when the address is already registered send a "someone tried to sign up with your address — sign in or reset your password" mail instead of creating anything. The second option keeps the user informed via the channel that proves ownership, which is the same reasoning the reset flow already uses. The `P2002` race handler at line 93 must keep returning something indistinguishable too.

---

### 🔵 Low — Timing oracle on `forgot-password` (already documented)

- **File:** `src/app/api/auth/forgot-password/route.ts:53-71`
- **Issue:** An address with an account runs a cooldown query, a token insert and a full HTTP round trip to Resend before replying; an unknown address returns after one indexed lookup. The response bodies are identical, but the latency is not.
- **Exploit:** An attacker measures response time and separates registered from unregistered addresses despite the identical body — the same enumeration the generic response exists to prevent, at lower confidence and lower rate.
- **Status:** Already recorded as a known, accepted gap in `context/current-feature.md`, including that `resend-verification` has the same shape and that the real fix means replying before sending. Listed here for completeness, not as a new discovery.
- **Fix:** Reply first, send after — move the send behind `after()` from `next/server` so the response does not wait on Resend. That equalizes the dominant term. The remaining cooldown-query difference is small enough to be lost in network noise.

---

## Uncertain / Needs Manual Confirmation

- **`AUTH_URL` in `.env.production`.** `getAppUrl()` (`src/lib/email/resend.ts:41`) builds every link in outgoing mail from `AUTH_URL`, and the project history records that `.env.production` still pointed at localhost. Both env files are gitignored, so this audit cannot see the current value. If it is still localhost, production verification and reset emails carry links that go nowhere — a functional break in the reset path rather than a vulnerability. **Check the deployed value in Vercel's project settings before launch.** The same applies to `EMAIL_VERIFICATION_ENABLED`: unset means verification stays on, which is the safe direction, but confirm it is what you intend in production.

---

## Passed Checks

Things this codebase gets right. Several are controls that are commonly missed, and two are cases where an obvious-looking "fix" would be wrong.

- ✅ **Password hashing has exactly one implementation** — `src/lib/auth/password.ts` exports `hashPassword` at cost 12, and registration (`register/route.ts:63`), reset (`reset-password/route.ts:54`) and change (`change-password/route.ts:93`) all call it. Cost factor and algorithm cannot drift between the three write sites, and it matches `prisma/seed.ts`.
- ✅ **No empty-password bypass on OAuth accounts** — `authorize` returns `null` when `!user?.password` (`src/auth.ts:45`) *before* reaching `bcrypt.compare`, so a GitHub-only account cannot be signed into by submitting an empty or absent password. `change-password` (line 74) and `forgot-password` (line 62) make the same check independently rather than assuming it.
- ✅ **Tokens are CSPRNG-generated and stored hashed** — `randomBytes(32).toString("base64url")` with only the SHA-256 digest persisted, in both `verification-token.ts:36` and `password-reset-token.ts:65`. A database dump yields no working links. 256 bits also puts token guessing out of reach, which is why the absence of rate limiting on `reset-password` is not itself a finding.
- ✅ **Single use is enforced atomically, not advisory** — the delete and the user update share one `$transaction` in both flows (`verification-token.ts:126`, `password-reset-token.ts:181`), and `P2025` is caught and reported as `invalid`, so two simultaneous clicks cannot both succeed. Expiry is checked at claim time, not merely written to the row.
- ✅ **The shared-table hazard is closed in both directions** — reset tokens are namespaced `password-reset:<email>`, every reset query is scoped to that prefix, and `consumeVerificationToken:98` refuses a prefixed row **and returns without deleting it**, because that row belongs to the other flow. Rows are found by hash, which is not namespaced, so without both guards either flow would spend the other's token. Getting the non-deleting half right is the part that is usually missed.
- ✅ **Reset TTL is deliberately shorter than verification** — 1 hour against 24 (`password-reset-token.ts:30`), reflecting that a reset link grants a password change rather than a confirmation. Both flows delete any outstanding token before issuing a new one, so only the newest link works.
- ✅ **Each link's entry point matches what it does** — verification points at `GET /api/auth/verify-email`, which mutates and then redirects to `/verify-email?status=…` so the token stops travelling in the address bar, history and referrer. Reset points at a *page*, because arriving only reads the token to decide what to render; the mutation happens on submit with the token in a request body. Both are correct, and they are opposites for a reason.
- ✅ **The unverified-account message is placed after the password check** — `EmailNotVerifiedError` is thrown only once `bcrypt.compare` has passed (`src/auth.ts:57`), so a wrong guess still gets the vague "Invalid email or password" and the specific message reaches only someone who already proved they hold the credentials. This is the right ordering and it is easy to get backwards.
- ✅ **The verification kill-switch fails closed** — `isEmailVerificationEnabled()` treats anything other than the exact string `"false"` as enabled, is read through one function at five call sites, and is never `NEXT_PUBLIC_`. With the flag off, registration stamps `emailVerified` at create rather than leaving it null, so accounts are not stranded when it is turned back on.
- ✅ **Password change requires the current password and refuses to invent one** — `change-password/route.ts:84` verifies with `bcrypt.compare` before writing, which is what stops a borrowed unlocked screen becoming a stolen account, and line 74 refuses GitHub-only accounts rather than quietly adding a second way in. Being specific about the failure here is correct, and the route's comment explains why the vagueness rule does not apply.
- ✅ **Account deletion re-checks the confirmation server-side** — `actions/account.ts:32` compares the typed email itself; the disabled button in `DeleteAccountDialog` is convenience only. The deletion order (items → own item types → user) respects `Item.itemType`'s `onDelete: Restrict` instead of racing the user cascade against it, and system item types (`userId = null`) and shared `Tag` rows are untouched. `signOut` is called outside the `try` so its `NEXT_REDIRECT` is not swallowed.
- ✅ **The profile reads the database, not the JWT** — `getCurrentUser` (`src/lib/db/user.ts:47`) returns fresh data and `null` when the session names a deleted user, and exposes `hasPassword: boolean` rather than the hash, so no password hash ever reaches a client component. `/sign-in` and `/register` use the same function, which is what prevents the redirect loop a stale JWT would otherwise cause.
- ✅ **Every mutating endpoint authenticates independently of the proxy** — `change-password` resolves the user from the session and 401s (including when the account no longer exists), `deleteAccount` calls `getCurrentUser` itself, and `ProfilePage` redirects on `null` with a comment noting the proxy is a redirect, not an authorization boundary. Correct: the matcher covers `/dashboard` and `/profile` but no API route.
- ✅ **`callbackUrl` is validated twice and rejects protocol-relative URLs** — `safePath` (`src/lib/search-params.ts:15`) requires a leading `/` **and** rejects `//`, and runs on the page and again in the action, since the hidden field arrives from the client. Repeated values are handled by `firstParam`.
- ✅ **User-supplied values are escaped into email HTML** — `escapeHtml` in both templates, and send failures log `error.message` only, never the URL holding the token.
- ✅ **The signup race is handled** — the pre-check at `register/route.ts:45` cannot be atomic, so `P2002` from the unique index is caught and reported as a duplicate rather than a 500.

---

## Not Audited

- Live environment variable values (`.env`, `.env.production` are gitignored) — see Uncertain above.
- NextAuth's own internals: CSRF on `/api/auth/*`, cookie flags, OAuth `state`/PKCE, and JWT signing are the framework's responsibility and were excluded by design.
- The GitHub OAuth app's registered callback URLs and secret handling, which live outside this repository.
- Runtime behaviour: this was a static read of the code. Nothing here was confirmed by executing an attack against a running instance.
