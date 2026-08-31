-- ============================================================
-- Homework profiles
--
-- homework_items has always been one flat list per household — fine
-- for one kid, confusing once a second one starts using the app,
-- since there was no way to tell whose assignment was whose. This
-- adds a lightweight "profile" per student (just a name — not a
-- login, not a household_members row) that homework_items now
-- belongs to.
--
-- Same RLS shape as every other household-scoped table: any member
-- can read/write, gated only by is_household_member() (defined in
-- 0001_init.sql).
-- ============================================================

create table homework_profiles (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

alter table homework_profiles enable row level security;

create policy "homework_profiles_all_household_members"
  on homework_profiles for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- Every assignment now belongs to a profile. Nullable because
-- existing rows predate this column and there's no reliable way to
-- guess whose homework they were — they just won't show up under any
-- profile's list until someone re-adds them. Cascades on profile
-- delete: a profile's homework has no meaning once the profile that
-- organized it is gone (mirrors delete_household's own cascade
-- reasoning in 0004).
alter table homework_items add column profile_id uuid references homework_profiles(id) on delete cascade;
