-- Petty — log_entry (Task 2)

create type log_kind as enum (
  'symptom',
  'behavior',
  'meal',
  'stool',
  'activity',
  'incident',
  'note'
);

create table public.log_entry (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  kind log_kind not null,
  severity smallint check (severity is null or (severity between 1 and 5)),
  tags text[] not null default '{}',
  body text,
  structured jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index log_entry_pet_occurred_idx
  on public.log_entry (pet_id, occurred_at desc)
  where deleted_at is null;

create trigger log_entry_set_updated_at before update on public.log_entry
  for each row execute function public.set_updated_at();

alter table public.log_entry enable row level security;

create policy "log_entry_read" on public.log_entry for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "log_entry_insert" on public.log_entry for insert
  with check (
    author_id = auth.uid()
    and pet_id in (select id from public.pet where household_id in (select public.user_household_ids()))
  );

-- Edit / delete only your own entries
create policy "log_entry_update_own" on public.log_entry for update
  using (author_id = auth.uid());

create policy "log_entry_delete_own" on public.log_entry for delete
  using (author_id = auth.uid());
