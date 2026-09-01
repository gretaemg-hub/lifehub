-- ============================================================
-- Fix: deleting your own account failed if you were a household's
-- creator and other members were still in it.
--
-- 0004_household_rename_delete.sql added households.created_by as a
-- plain `references auth.users(id)` foreign key — no ON DELETE
-- action specified, which defaults to RESTRICT/NO ACTION.
-- delete_own_account() (0002_profile_and_account_deletion.sql) only
-- deletes a household row when the departing member was its LAST
-- member; if other members remain, the household survives and
-- created_by still points at the departing user, so the final
-- `delete from auth.users` in delete_own_account() failed with a
-- foreign key violation the moment anyone with family still in their
-- household tried to delete their account.
--
-- Fix: created_by now goes null when its creator's account is
-- deleted, instead of blocking the deletion outright. The household
-- and every family member's shared data are untouched — there's just
-- no recorded "creator" anymore afterward. delete_household() is
-- updated to treat a null created_by as "nobody is currently
-- authorized to delete this household" (a clear, correct message)
-- rather than misreporting "household not found."
-- ============================================================

alter table households drop constraint households_created_by_fkey;
alter table households add constraint households_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

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
  if not found then
    raise exception 'Household not found';
  end if;
  if v_created_by is null or v_created_by is distinct from auth.uid() then
    raise exception 'Only the person who created this household can delete it';
  end if;
  delete from households where id = p_household_id;
end;
$$;
