-- ============================================================
-- Make family invite links reusable instead of single-use.
--
-- 0001_init.sql gave household_invites.max_uses a `not null default
-- 1` — every invite code, including the permanent "Share a family
-- link" one shown in Household Settings, could only ever be redeemed
-- once. That's fine for a one-off code but wrong for a link that's
-- meant to be handed to the whole family: the second person to tap it
-- got "Invite has already been used" with no obvious way to fix it
-- from the UI.
--
-- Fix: max_uses becomes nullable, with null meaning "no limit" — the
-- same convention expires_at already uses. New invites default to
-- unlimited; existing invites are backfilled to unlimited too, so
-- links already shared before this migration start working again
-- without anyone having to regenerate them. redeem_invite() already
-- treats max_uses as a real cap only when it's non-null and doesn't
-- need any other changes to its own logic.
-- ============================================================

alter table household_invites alter column max_uses drop not null;
alter table household_invites alter column max_uses set default null;
update household_invites set max_uses = null;

create or replace function redeem_invite(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite household_invites;
begin
  select * into v_invite from household_invites where upper(code) = upper(p_code) for update;
  if v_invite is null then
    raise exception 'Invite code not found';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'Invite has already been used';
  end if;

  insert into household_members (household_id, user_id, display_name, role)
    values (v_invite.household_id, auth.uid(), p_display_name, 'parent')
    on conflict (household_id, user_id) do nothing;

  update household_invites set use_count = use_count + 1 where id = v_invite.id;

  return v_invite.household_id;
end;
$$;
