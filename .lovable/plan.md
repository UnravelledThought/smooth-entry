# Security Audit — AniTrack (pre-launch)

## 1. Executive summary

Overall risk: **Medium**. No exposed secrets, no admin surface, RLS is enabled on every table with real owner-scoped policies, and the database linter is clean. The biggest real risk is the **shared anime cache server function**: it is unauthenticated and accepts arbitrary search terms, so anyone can drive unlimited outbound API calls and unlimited writes into your `anime_cache` table (cost + storage abuse, no rate limit anywhere).

Second-biggest: the login identity model. There are no emails by design (usernames map to synthetic `@otaku.local` addresses, no verification, no user data collected), so the password is the only secret — and usernames are publicly readable, which turns the public profile list into a target list for password guessing. The fix is throttling, not email.

Recommendation: fix the cache endpoint and add basic abuse limits before launch; the rest is hardening.

## 2. Table of issues

| Issue | Severity | Verified? | Why it matters | How to fix | Location |
|---|---|---|---|---|---|
| Unauthenticated cache server function writes to DB and calls Jikan | High | Verified (no middleware, allowlist accepts any `q=`) | Anyone can loop random search terms: unbounded upstream API calls (rate-limit ban) and unbounded rows in `anime_cache` | Require auth, cap key shape/length, add per-user throttle, cap row count / add cleanup | `src/lib/anime-cache.functions.ts` |
| No rate limiting on sign-in / sign-up | High | Verified (no limiter in code) | Credential guessing, signup flooding | Rely on provider limits + add client-side backoff and per-username cooldown | `src/lib/auth.tsx`, `src/routes/auth.tsx` |
| Login email derivable from public username | Medium | Verified (`username@otaku.local`, profiles readable by `anon`) | Public profile list doubles as a valid-account list for guessing | Accept (design choice) but pair with the rate limiting above; keep failure message generic (already generic) | `src/lib/auth.tsx` |
| "Account required" is frontend-only | Medium | Verified (redirects in components; `anon` has SELECT on profiles + shared/pinned entries) | A logged-out visitor can read shared/pinned data directly via the API even though the UI redirects | Decide intent: if the feed/profiles are meant to be public this is fine; if not, drop `anon` grants and gate reads | `src/routes/index.tsx`, migrations |
| Any pinned entry readable by anyone, including personal score | Medium | Verified (policy `is_shared = true OR is_pinned = true`) | Users may pin privately, not expecting scores/progress to be public | Only expose pinned rows via an explicit "public" flag, or document that pin = public | `watchlist_entries` policies |
| Avatar objects readable by anyone who knows the path | Low | Verified (`Avatar read all` policy on `storage.objects`) | Bucket is private but the SELECT policy is unconditional for that bucket | Acceptable for profile pictures; no change needed unless avatars should be private | migration 4 |
| No upload MIME/size validation server-side | Low | Verified (checks are client-side) | User can upload a large or non-image file | Set bucket size/MIME restrictions | avatars bucket |
| Anonymous sign-ins must stay disabled | Low | Not verified from code | Emails are intentionally not used (synthetic `@otaku.local` addresses, no verification, no user data logged) — so account creation is unattended by design; the only setting that matters is that anonymous sign-ins stay off | Confirm anonymous sign-ins are disabled; no email confirmation work needed | auth config |

## 3. Top 5 fixes before launch

1. Lock down `fetchAnimeCached`: require an authenticated caller, tighten the allowlist (normalize + length-limit the search term, reject unusual characters), and add a per-user call throttle.
2. Bound the cache: cap `anime_cache` growth (row limit or age-based cleanup) so a flood cannot fill the database.
3. Add login/signup throttling and backoff so guessing against known usernames is slow.
4. Decide and enforce the public/private boundary: either keep the shared feed public (and say so) or remove `anon` read grants and make pinned-implies-public explicit in the UI.
5. Restrict the avatars bucket to image MIME types and a size cap at the storage level, not just in the browser.

## 4. Things that look good

- RLS enabled on all three public tables, with explicit `GRANT`s and owner-scoped write policies (`auth.uid() = user_id`).
- No secrets in frontend code; the service-role client is only imported inside a server handler.
- Database functions use `SECURITY DEFINER` with a pinned `search_path`, and `EXECUTE` is revoked from `anon`/`authenticated`.
- The cache endpoint already has an allowlist, so it is not an open proxy to arbitrary URLs.
- Database linter reports no issues.
- No admin area, no payments, no third-party AI endpoints to abuse.

## 5. Manual tests to run

- Logged out: open `/list`, `/settings`, `/stats` directly — confirm redirect, then check the network tab for any data that still returns.
- Two accounts: with user A's session, try updating and deleting user B's entry by ID — both must fail.
- Call the cache endpoint repeatedly with random search terms and watch whether rows keep accumulating.
- Upload a large non-image file as an avatar and see whether it is rejected.
- Attempt to sign in ~20 times with a wrong password for a username taken from a public profile; observe whether anything slows you down.
- Change the `uid` in a `/u/name.uid` URL and confirm nothing private appears.

## 6. Questions I need answered

- Is the shared feed (and pinned anime) intended to be visible to logged-out visitors? The current policies allow it while the UI hides it.
- Should pinning an entry always make it public, or do you want a separate visibility toggle?

## 7. Launch recommendation

Safe to launch after fixes 1–3. Fixes 4–5 are hardening and can follow. Nothing here risks a data breach of credentials or private messages; the exposure is limited to profile/watchlist data that is already semi-public by design.

## 8. Technical notes

- Cache hardening will be implemented as `.middleware([requireSupabaseAuth])` on `fetchAnimeCached` plus a stricter `inputValidator` and a throttle table or per-user counter; the client call sites in `src/lib/anime-api.ts` need the auth attacher already registered in `src/start.ts`.
- Cache bounding and storage MIME/size limits are migration + bucket-config changes, not app code.
