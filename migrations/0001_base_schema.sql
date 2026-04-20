-- Petty — base schema (Task 1)
-- Tables: users, household, household_member, pet, condition, medication
-- RLS: household membership scopes all reads/writes

create extension if not exists citext;

-- Enums
create type subscription_tier as enum ('free', 'pro');
create type member_role as enum ('owner', 'caretaker');
create type species_kind as enum ('dog', 'cat', 'other');
create type sex_kind as enum ('male', 'female', 'unknown');
create type condition_status as enum ('active', 'resolved', 'monitoring');

-- Users: mirror of auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  display_name text,
  avatar_url text,
  subscription_tier subscription_tier not null default 'free',
  created_at timestamptz not null default now()
);

-- Household: unit of shared pet care
create table public.household (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Household membership
create table public.household_member (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role member_role not null default 'caretaker',
  invited_email citext,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_member_user_idx on public.household_member(user_id);

-- Pet: the core object
create table public.pet (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  name text not null,
  species species_kind not null,
  breed text,
  sex sex_kind not null default 'unknown',
  neutered boolean,
  date_of_birth date,
  weight_kg numeric(5,2),
  microchip_id text,
  vet_name text,
  vet_contact text,
  avatar_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index pet_household_idx on public.pet(household_id) where deleted_at is null;

-- Condition: known ongoing issues
create table public.condition (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet(id) on delete cascade,
  label text not null,
  status condition_status not null default 'active',
  started_on date,
  resolved_on date,
  notes text,
  created_at timestamptz not null default now()
);

create index condition_pet_idx on public.condition(pet_id);

-- Medication: prescriptions; doses log adherence (future task)
create table public.medication (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet(id) on delete cascade,
  name text not null,
  dose_amount text,
  schedule text,
  start_date date,
  end_date date,
  prescribed_by text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index medication_pet_idx on public.medication(pet_id);

-- Helper: household ids for current user (SECURITY DEFINER to avoid RLS recursion)
create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_member where user_id = auth.uid();
$$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pet_set_updated_at before update on public.pet
  for each row execute function public.set_updated_at();

-- Auto-provision public.users + household + owner member on first sign-in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.household (name, owner_id)
  values (coalesce(split_part(new.email, '@', 1), 'My household'), new.id)
  returning id into new_household_id;

  insert into public.household_member (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.household enable row level security;
alter table public.household_member enable row level security;
alter table public.pet enable row level security;
alter table public.condition enable row level security;
alter table public.medication enable row level security;

-- users: self only
create policy "users_self_read" on public.users for select using (id = auth.uid());
create policy "users_self_update" on public.users for update using (id = auth.uid());

-- household: members read; owner writes
create policy "household_member_read" on public.household for select
  using (id in (select public.user_household_ids()));
create policy "household_self_insert" on public.household for insert
  with check (owner_id = auth.uid());
create policy "household_owner_update" on public.household for update
  using (owner_id = auth.uid());
create policy "household_owner_delete" on public.household for delete
  using (owner_id = auth.uid());

-- household_member: members read; owners manage
create policy "hm_member_read" on public.household_member for select
  using (household_id in (select public.user_household_ids()));
create policy "hm_owner_insert" on public.household_member for insert
  with check (
    household_id in (select h.id from public.household h where h.owner_id = auth.uid())
  );
create policy "hm_owner_delete" on public.household_member for delete
  using (
    household_id in (select h.id from public.household h where h.owner_id = auth.uid())
  );

-- pet: members read/write; owners delete
create policy "pet_read" on public.pet for select
  using (household_id in (select public.user_household_ids()));
create policy "pet_insert" on public.pet for insert
  with check (household_id in (select public.user_household_ids()));
create policy "pet_update" on public.pet for update
  using (household_id in (select public.user_household_ids()));
create policy "pet_delete" on public.pet for delete
  using (household_id in (select h.id from public.household h where h.owner_id = auth.uid()));

-- condition: members CRUD via pet
create policy "condition_read" on public.condition for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "condition_insert" on public.condition for insert
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "condition_update" on public.condition for update
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "condition_delete" on public.condition for delete
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

-- medication: members CRUD via pet
create policy "medication_read" on public.medication for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "medication_insert" on public.medication for insert
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "medication_update" on public.medication for update
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
create policy "medication_delete" on public.medication for delete
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
