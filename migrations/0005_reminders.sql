-- Petty — reminders + medication doses (Task 6)

create type public.reminder_kind as enum ('medication', 'vet_followup', 'custom');
create type public.reminder_status as enum ('pending', 'done', 'skipped');
create type public.dose_outcome as enum ('given', 'missed', 'refused');

-- Reminder: a scheduled nudge
create table public.reminder (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet(id) on delete cascade,
  medication_id uuid references public.medication(id) on delete cascade,
  kind public.reminder_kind not null,
  title text not null,
  due_at timestamptz not null,
  status public.reminder_status not null default 'pending',
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index reminder_pet_due_idx on public.reminder (pet_id, due_at)
  where status = 'pending';
create index reminder_medication_idx on public.reminder (medication_id)
  where medication_id is not null;

alter table public.reminder enable row level security;

create policy "reminder_select_member"
  on public.reminder for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "reminder_insert_member"
  on public.reminder for insert
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "reminder_update_member"
  on public.reminder for update
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())))
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "reminder_delete_member"
  on public.reminder for delete
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

-- Medication dose: adherence log
create table public.medication_dose (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medication(id) on delete cascade,
  pet_id uuid not null references public.pet(id) on delete cascade,
  reminder_id uuid references public.reminder(id) on delete set null,
  given_by uuid references public.users(id) on delete set null,
  outcome public.dose_outcome not null,
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index medication_dose_pet_occurred_idx on public.medication_dose (pet_id, occurred_at desc);
create index medication_dose_medication_idx on public.medication_dose (medication_id, occurred_at desc);

alter table public.medication_dose enable row level security;

create policy "medication_dose_select_member"
  on public.medication_dose for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "medication_dose_insert_member"
  on public.medication_dose for insert
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "medication_dose_update_member"
  on public.medication_dose for update
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())))
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "medication_dose_delete_member"
  on public.medication_dose for delete
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));
