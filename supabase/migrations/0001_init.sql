-- ============================================================
-- LifeHub — Phase 1 schema + Row Level Security
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI:
-- `supabase db push`) on a fresh project, top to bottom, once.
--
-- Design notes:
--   - Every "Family" table carries household_id and is readable/
--     writable by anyone in that household (checked via the
--     is_household_member() helper below).
--   - Every "Personal" table carries user_id and is readable/
--     writable only by that user (auth.uid() = user_id).
--   - household_members has NO client-facing INSERT policy on
--     purpose — the only ways to join a household are the two
--     SECURITY DEFINER functions at the bottom (create_household /
--     redeem_invite), so membership can never be forged by a client
--     crafting its own insert.
--   - Wishlists get extra treatment: an owner must never be able to
--     read who reserved their own gift, even though they're a member
--     of the same household. That's enforced with a real column-level
--     trick (a security_invoker view) rather than hiding it in the
--     UI — see the WISHLISTS section for the full explanation.
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()


-- ============================================================
-- HOUSEHOLDS + MEMBERSHIP
-- ============================================================

create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  role          text not null default 'parent' check (role in ('parent', 'child')),
  created_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

-- Invite codes — the real replacement for the prototype's
-- "+ Add family member" button. A member generates a code; anyone
-- who redeems it (via the redeem_invite() function below) is added
-- to the household automatically.
create table household_invites (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code        text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,              -- null = never expires
  max_uses    int not null default 1,
  use_count   int not null default 0
);


-- Helper used in nearly every policy below. SECURITY DEFINER so it
-- can read household_members even from inside a policy on a
-- DIFFERENT table without tripping that table's own RLS recursively.
create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id
      and user_id = auth.uid()
  );
$$;


alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

create policy "households_select_members"
  on households for select
  using (is_household_member(id));

-- Anyone signed in may create a household row directly (used by the
-- create_household() function below, which does this + the first
-- membership row together). No general UPDATE/DELETE policy is
-- defined yet — add one later if you want a "rename household" UI.
create policy "households_insert_authenticated"
  on households for insert
  with check (auth.uid() is not null);

create policy "household_members_select_same_household"
  on household_members for select
  using (is_household_member(household_id));

-- No INSERT policy here on purpose (see header note) — rows are only
-- ever created by create_household() / redeem_invite(), both
-- SECURITY DEFINER, both below.

create policy "household_members_update_own_display_name"
  on household_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "household_members_delete_self"
  on household_members for delete
  using (user_id = auth.uid());

create policy "household_invites_select_members"
  on household_invites for select
  using (is_household_member(household_id));

create policy "household_invites_insert_members"
  on household_invites for insert
  with check (is_household_member(household_id) and created_by = auth.uid());


-- ============================================================
-- SHOPPING LIST — Family
-- ============================================================
create table shopping_items (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  text        text not null,
  checked     boolean not null default false,
  repeating   boolean not null default false,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table shopping_items enable row level security;

create policy "shopping_items_all_household_members"
  on shopping_items for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));


-- ============================================================
-- CALENDARS
-- ============================================================
create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  all_day     boolean not null default true,
  start_time  time,
  end_time    time,
  color       text not null default '#3E6259',
  is_birthday boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table personal_calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  all_day     boolean not null default true,
  start_time  time,
  end_time    time,
  color       text not null default '#3E6259',
  created_at  timestamptz not null default now()
);

alter table calendar_events enable row level security;
alter table personal_calendar_events enable row level security;

create policy "calendar_events_all_household_members"
  on calendar_events for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- This is the RLS equivalent of the prototype's "show my personal
-- events" overlay — except now it's a real guarantee: nobody but
-- user_id can ever select these rows, no matter what UI toggle they
-- flip, because the database itself won't return them.
create policy "personal_calendar_events_owner_only"
  on personal_calendar_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- BIRTHDAYS — Family
-- ============================================================
create table birthdays (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  date           date not null,
  linked_event_id uuid references calendar_events(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table birthdays enable row level security;

create policy "birthdays_all_household_members"
  on birthdays for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));


-- ============================================================
-- WISHLISTS — Family, with the "owner can't see their own
-- reservations" privacy rule enforced at the database level.
--
-- Base table RLS lets any household member SELECT any row's raw
-- columns (including reserved_by) — that's fine, because we then
-- REVOKE the table-level SELECT grant from `authenticated` entirely
-- and only GRANT SELECT on the view below. A client (or a rogue bit
-- of JS) querying wishlist_items directly gets a permission error
-- before RLS even runs; the view is the ONLY read path, and it nulls
-- out reserved_by for the owner.
-- ============================================================
create table wishlist_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  owner_user_id  uuid not null references auth.users(id),
  text           text not null,
  reserved_by    uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

alter table wishlist_items enable row level security;

create policy "wishlist_items_select_household_members"
  on wishlist_items for select
  using (is_household_member(household_id));

create policy "wishlist_items_insert_own_item"
  on wishlist_items for insert
  with check (is_household_member(household_id) and owner_user_id = auth.uid());

create policy "wishlist_items_delete_own_item"
  on wishlist_items for delete
  using (owner_user_id = auth.uid());

-- No UPDATE policy: reserving/un-reserving only happens through the
-- SECURITY DEFINER functions below, which is what actually stops an
-- owner from just reserving (and thus seeing who called dibs on)
-- their own gift.

revoke select on wishlist_items from authenticated;

create view wishlist_items_visible
with (security_invoker = true) as
select
  id,
  household_id,
  owner_user_id,
  text,
  case when owner_user_id = auth.uid() then null else reserved_by end as reserved_by,
  created_at
from wishlist_items;

grant select on wishlist_items_visible to authenticated;

create or replace function reserve_wishlist_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item wishlist_items;
begin
  select * into v_item from wishlist_items where id = p_item_id;
  if v_item is null then
    raise exception 'Wishlist item not found';
  end if;
  if not is_household_member(v_item.household_id) then
    raise exception 'Not a member of this household';
  end if;
  if v_item.owner_user_id = auth.uid() then
    raise exception 'You cannot reserve your own wishlist item';
  end if;
  if v_item.reserved_by is not null then
    raise exception 'Already reserved';
  end if;
  update wishlist_items set reserved_by = auth.uid() where id = p_item_id;
end;
$$;

create or replace function unreserve_wishlist_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item wishlist_items;
begin
  select * into v_item from wishlist_items where id = p_item_id;
  if v_item is null then
    raise exception 'Wishlist item not found';
  end if;
  if v_item.reserved_by is distinct from auth.uid() then
    raise exception 'Only the person who reserved this item can un-reserve it';
  end if;
  update wishlist_items set reserved_by = null where id = p_item_id;
end;
$$;

grant execute on function reserve_wishlist_item(uuid) to authenticated;
grant execute on function unreserve_wishlist_item(uuid) to authenticated;


-- ============================================================
-- NOTES — Personal
-- ============================================================
create table notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  blocks      jsonb not null default '[]',   -- the typed content blocks
  strokes     jsonb not null default '[]',   -- pen/eraser drawing data
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table notes enable row level security;

create policy "notes_owner_only"
  on notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- FITNESS TRACKER + WORKOUT PLAN — Personal
-- ============================================================
create table fitness_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  activity    text not null,
  duration    int not null check (duration > 0),
  date        date not null,
  created_at  timestamptz not null default now()
);

create table workout_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  duration_minutes  int,
  warmup            jsonb not null default '[]',
  main              jsonb not null default '[]',
  cooldown          jsonb not null default '[]',
  updated_at        timestamptz not null default now()
);

alter table fitness_log enable row level security;
alter table workout_plans enable row level security;

create policy "fitness_log_owner_only"
  on fitness_log for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "workout_plans_owner_only"
  on workout_plans for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- SCHOOL & HOMEWORK — Family
-- ============================================================
create table homework_items (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  subject     text not null,
  description text not null default '',
  due_date    date not null,
  due_time    time,
  completed   boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table homework_items enable row level security;

create policy "homework_items_all_household_members"
  on homework_items for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));


-- ============================================================
-- MEAL PLAN — Family
-- One row per (household, day, meal) cell — 28 rows per household
-- once fully filled in, matching the prototype's 7x4 grid.
-- ============================================================
create table meal_plan_cells (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references households(id) on delete cascade,
  day                 text not null check (day in ('sunday','monday','tuesday','wednesday','thursday','friday','saturday')),
  meal                text not null check (meal in ('breakfast','snack','lunch','dinner')),
  dish                text not null default '',
  ingredients         jsonb not null default '[]',
  sync_to_shopping_list boolean not null default false,
  updated_at          timestamptz not null default now(),
  unique (household_id, day, meal)
);

alter table meal_plan_cells enable row level security;

create policy "meal_plan_cells_all_household_members"
  on meal_plan_cells for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));


-- ============================================================
-- updated_at bookkeeping — small generic trigger, attached only to
-- tables that actually track an updated_at column.
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_notes_updated_at before update on notes
  for each row execute function set_updated_at();

create trigger trg_workout_plans_updated_at before update on workout_plans
  for each row execute function set_updated_at();

create trigger trg_meal_plan_cells_updated_at before update on meal_plan_cells
  for each row execute function set_updated_at();


-- ============================================================
-- ONBOARDING FUNCTIONS — the real replacement for "Who are you?"
--
-- create_household(): the first thing a brand-new user calls after
-- signing up if they're not joining an existing household. Creates
-- the household AND the caller's own membership row atomically, so
-- there's never a moment where a household exists with zero members
-- (which the household_members insert policy would otherwise make
-- impossible to recover from, since only these functions can insert).
--
-- redeem_invite(): what an invite link/code actually does when
-- opened by a signed-in user.
-- ============================================================
create or replace function create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  insert into households (name) values (p_name) returning id into v_household_id;
  insert into household_members (household_id, user_id, display_name, role)
    values (v_household_id, auth.uid(), p_display_name, 'parent');
  return v_household_id;
end;
$$;

create or replace function redeem_invite(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite household_invites;
begin
  select * into v_invite from household_invites where code = p_code for update;
  if v_invite is null then
    raise exception 'Invite code not found';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;
  if v_invite.use_count >= v_invite.max_uses then
    raise exception 'Invite has already been used';
  end if;

  insert into household_members (household_id, user_id, display_name, role)
    values (v_invite.household_id, auth.uid(), p_display_name, 'parent')
    on conflict (household_id, user_id) do nothing;

  update household_invites set use_count = use_count + 1 where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

grant execute on function create_household(text, text) to authenticated;
grant execute on function redeem_invite(text, text) to authenticated;
