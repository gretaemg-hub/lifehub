-- ============================================================
-- Household rename + delete
--
-- Two new household-level actions the schema didn't yet support:
--   - Any member may rename the household — low-stakes, no need to
--     gate it to whoever created it.
--   - Only the household's CREATOR (whoever originally ran
--     create_household(), not just anyone who happens to be in it)
--     may delete it outright — the highest-stakes action a member
--     can take, since it wipes every shared list for everyone.
--
-- Both go through new SECURITY DEFINER functions rather than a raw
-- UPDATE/DELETE policy on `households`, matching this project's
-- existing pattern (create_household / redeem_invite /
-- delete_own_account / reserve_wishlist_item, all in 0001_init.sql).
-- There is still no general UPDATE/DELETE policy on `households` —
-- a client can only ever touch it through these two functions, so
-- membership alone is never enough to delete one out from under
-- everyone else.
-- ============================================================

alter table households add column created_by uuid references auth.users(id);

-- Backfill for every household that already existed before this
-- column did: the only way a household could ever have come to exist
-- is through create_household(), which always inserts the caller's
-- own membership row in the same transaction — so whoever has the
-- earliest household_members row for a household is, by construction,
-- the person who created it.
update households h
set created_by = (
  select hm.user_id
  from household_members hm
  where hm.household_id = h.id
  order by hm.created_at asc
  limit 1
);

-- Re-created to also set created_by on the new row. Everything else
-- about this function (including the hardcoded role) is unchanged
-- from 0001_init.sql.
create or replace function create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  insert into households (name, created_by) values (p_name, auth.uid()) returning id into v_household_id;
  insert into household_members (household_id, user_id, display_name, role)
    values (v_household_id, auth.uid(), p_display_name, 'parent');
  return v_household_id;
end;
$$;

create or replace function rename_household(p_household_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_household_member(p_household_id) then
    raise exception 'Not a member of this household';
  end if;
  if trim(p_name) = '' then
    raise exception 'Household name cannot be empty';
  end if;
  update households set name = trim(p_name) where id = p_household_id;
end;
$$;

create or replace function delete_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
begin
  select created_by into v_created_by from households where id = p_household_id;
  if v_created_by is null then
    raise exception 'Household not found';
  end if;
  if v_created_by is distinct from auth.uid() then
    raise exception 'Only the person who created this household can delete it';
  end if;
  -- Every household-scoped table (household_members, household_invites,
  -- shopping_items, calendar_events, birthdays, wishlist_items,
  -- homework_items, meal_plan_cells) references household_id with
  -- `on delete cascade`, so this one delete takes all of it with it.
  -- Personal tables (notes, fitness_log, workout_plans,
  -- personal_calendar_events) are scoped by user_id, not household_id
  -- — deleting a household never touches anyone's personal data.
  delete from households where id = p_household_id;
end;
$$;

grant execute on function rename_household(uuid, text) to authenticated;
grant execute on function delete_household(uuid) to authenticated;
