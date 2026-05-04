-- Petty — household invites (Task 7)

create table public.invite (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  email citext not null,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invite_token_idx on public.invite(token) where accepted_at is null;
create index invite_household_idx on public.invite(household_id);

alter table public.invite enable row level security;

-- Household members can see invites for their household
create policy "invite_select_member"
  on public.invite for select
  using (household_id in (select public.user_household_ids()));

-- Only household owners can create invites
create policy "invite_insert_owner"
  on public.invite for insert
  with check (
    invited_by = auth.uid()
    and household_id in (
      select id from public.household where owner_id = auth.uid()
    )
  );

-- Only household owners can delete (revoke) invites
create policy "invite_delete_owner"
  on public.invite for delete
  using (
    household_id in (
      select id from public.household where owner_id = auth.uid()
    )
  );

-- Token acceptance is handled via a SECURITY DEFINER function to bypass RLS
-- (the accepting user is not yet a household member when they claim the invite)
create or replace function public.accept_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invite%rowtype;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return 'unauthenticated';
  end if;

  select * into v_invite
  from public.invite
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    return 'invalid';
  end if;

  -- Idempotent: if already a member, just mark accepted
  insert into public.household_member (household_id, user_id, role)
  values (v_invite.household_id, v_user_id, 'caretaker')
  on conflict (household_id, user_id) do nothing;

  update public.invite
  set accepted_at = now()
  where id = v_invite.id;

  return 'ok';
end;
$$;
