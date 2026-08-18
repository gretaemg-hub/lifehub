# LifeHub — React + Vite + Supabase

This is the Phase 0/1/2-start scaffold for turning the LifeHub prototype
into a real multi-household app, per `lifehub-production-roadmap.md`.

**Decisions locked in (Phase 0):** Supabase (Postgres + Auth + RLS) as the
backend, React + Vite as the frontend.

## What's actually here

- `supabase/migrations/0001_init.sql` — the full Phase 1 schema: every
  table from the roadmap, plus Row Level Security policies for all of
  them. Two things go further than the roadmap's sketch, because they're
  worth doing properly from the start rather than bolting on later:
  - **`household_members` has no client-facing INSERT policy at all.**
    The only way to join a household is through `create_household()` or
    `redeem_invite()`, two `SECURITY DEFINER` Postgres functions — so
    membership can never be forged by a client crafting its own insert.
  - **Wishlist reservations use a `security_invoker` view
    (`wishlist_items_visible`) that nulls out `reserved_by` for the
    item's own owner**, with direct table `SELECT` revoked so the raw
    column is genuinely unreachable — not just hidden in the UI. This is
    the "trickier privacy case" the roadmap calls out under Phase 3.
- **Phase 2 (auth + households) is scaffolded and working**: `src/context/AuthContext.jsx`
  (sign up / sign in / sign out), `src/context/HouseholdContext.jsx`
  (figures out which household you're in), `src/pages/Login.jsx`, and
  `src/pages/HouseholdOnboarding.jsx` (create a household or redeem an
  invite code — this is the real replacement for "Who are you?").
- **Phase 3, step 1 (Shopping List) is fully migrated** as the reference
  implementation: `src/features/shopping/useShoppingItems.js` +
  `ShoppingList.jsx`. It also adds Supabase Realtime, so if two people in
  the same household have the list open, changes appear live — something
  the prototype's `window.storage` couldn't do.

## What's NOT here yet

Everything else in Phase 3's migration order — Family Calendar, My
Calendar, Birthdays + Wishlists, Homework, Meal Plan, Notes, Fitness
Tracker. The tables and RLS policies for all of them already exist in
the migration file; only the React hook + component per feature is
still to build. Copy the shape of `src/features/shopping/` for each one.

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine to
   start).
2. **Run the migration**: open the SQL editor in your Supabase project
   dashboard, paste in the full contents of
   `supabase/migrations/0001_init.sql`, and run it once.
3. **Copy the env template**: `cp .env.example .env.local`, then fill in
   your project's URL and anon key from Project Settings → API.
4. **Install and run**:
   ```
   npm install
   npm run dev
   ```
5. Sign up with an email/password, create your first household, and the
   Shopping List should load (empty) and work end to end.

Supabase's default auth setup requires email confirmation before sign-in
works — for local testing, either check the confirmation email Supabase
sends, or turn off "Confirm email" under Authentication → Providers →
Email in your project's dashboard while you're developing.

## Next steps (continuing the roadmap)

Follow Phase 3's suggested order from `lifehub-production-roadmap.md`.
For each feature: create the hook (`use<Feature>.js`) modeled on
`useShoppingItems.js`, build the component modeled on `ShoppingList.jsx`,
add it to `App.jsx`. The tables + RLS already exist — you're only ever
replacing `window.storage.get/set` calls with Supabase `select()` /
`insert()` / `update()` / `delete()` calls filtered to
`activeHouseholdId` (Family) or `user.id` (Personal), exactly as the
roadmap describes.

Once every feature is migrated, Phase 4 (hosting on Vercel/Netlify) and
Phase 5 (privacy policy, error handling, abuse prevention, backups) are
what's left before calling it public.
