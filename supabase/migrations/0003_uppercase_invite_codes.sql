-- ============================================================
-- LifeHub — invite codes: uppercase letters only
--
-- household_invites.code previously defaulted to 8 characters of
-- lowercase hex (substr(md5(...))) — any letters in a generated code
-- (a-f) came out lowercase. Per request, a generated code should only
-- ever show uppercase letters.
--
-- Also makes redeem_invite() compare codes case-insensitively:
-- someone reading a code aloud or typing it in by hand (rather than
-- pasting it) shouldn't have redemption fail just because they typed
-- a different case than it was generated in. code itself stays
-- unique/indexed as-is (still uppercase going forward), this only
-- changes how a submitted code is matched against it.
-- ============================================================

alter table household_invites
  alter column code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

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
