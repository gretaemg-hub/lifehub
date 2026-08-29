-- ============================================================
-- LifeHub — Phase 2b: real profile (avatar + picture) + self-service
-- account deletion, bringing the real Supabase app up to parity with
-- the friends-demo's Profile Settings screen.
--
-- Run this in the Supabase SQL editor after 0001_init.sql.
-- ============================================================


-- ============================================================
-- PROFILE FIELDS on household_members
--
-- The demo's "profile" is per-device/per-account; the real app's
-- closest equivalent is a household_members row (display_name
-- already lives there — see 0001_init.sql). Rather than introduce a
-- separate global profiles table, avatar_color/avatar_url are added
-- to the same row: one real household per person is the expected
-- case for this app, and household_members already has a working
-- "update your own row" RLS policy (household_members_update_own_
-- display_name, 0001_init.sql) that covers these new columns too
-- with zero policy changes needed.
-- ============================================================
alter table household_members
  add column if not exists avatar_color text,
  add column if not exists avatar_url   text;


-- ============================================================
-- AVATAR STORAGE — a public bucket, one folder per user
-- (avatars/<user_id>/...), so avatar images can be shown to every
-- household member (e.g. on the Household tab) without needing a
-- signed URL, while only the owning user can write to their own
-- folder.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- delete_own_account() — the real backing for the demo's "Delete
-- account" button. SECURITY DEFINER because deleting from auth.users
-- isn't something the anon/authenticated client role can do directly
-- (and shouldn't be able to, for anyone but themselves — this
-- function only ever acts on auth.uid(), never a passed-in id).
--
-- Order matters: everything that references this user via a FK
-- *without* `on delete cascade` has to be cleaned up or reassigned
-- first, or the final `delete from auth.users` would fail with a
-- foreign-key violation. (household_members.user_id,
-- personal_calendar_events.user_id, notes.user_id,
-- fitness_log.user_id, and workout_plans.user_id all already cascade
-- — see 0001_init.sql — so those don't need handling here.)
-- ============================================================
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  -- Invite codes they generated: created_by is NOT NULL, so these
  -- rows can't just be nulled out — they're ephemeral, so simplest is
  -- to remove them outright, whether or not the household survives.
  delete from household_invites where created_by = auth.uid();

  -- Shared household items they merely *added*/*created* aren't
  -- theirs to take with them — leave the item, blank the attribution.
  update shopping_items  set added_by   = null where added_by   = auth.uid();
  update calendar_events set created_by = null where created_by = auth.uid();
  update homework_items  set created_by = null where created_by = auth.uid();

  -- A reservation they placed on someone ELSE's wishlist item frees
  -- back up for someone else to claim.
  update wishlist_items set reserved_by = null where reserved_by = auth.uid();

  -- Their OWN wishlist items really are theirs — these go with them.
  delete from wishlist_items where owner_user_id = auth.uid();

  -- Leave every household they belong to. If that empties a
  -- household, delete it too — its shopping list, calendars,
  -- birthdays, wishlist items, homework, and meal plan all cascade
  -- away with it (every household_id FK is `on delete cascade`, see
  -- 0001_init.sql), so nothing is left orphaned for nobody to see.
  for v_household_id in
    select household_id from household_members where user_id = auth.uid()
  loop
    delete from household_members where household_id = v_household_id and user_id = auth.uid();
    if not exists (select 1 from household_members where household_id = v_household_id) then
      delete from households where id = v_household_id;
    end if;
  end loop;

  -- Personal data — notes, fitness_log, workout_plans,
  -- personal_calendar_events — all cascade automatically once the
  -- auth.users row itself goes away, via their own `on delete
  -- cascade` foreign keys. This is also why the account is gone for
  -- good rather than just "logged out": the same email can sign up
  -- fresh afterward.
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
