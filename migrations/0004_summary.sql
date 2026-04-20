-- Petty — summary (Task 5)
-- Stores AI-generated vet-ready summaries with provenance.

create type public.summary_kind as enum ('vet_visit', 'range', 'issue');
create type public.summary_status as enum ('draft', 'final');

create table public.summary (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  kind public.summary_kind not null,
  status public.summary_status not null default 'final',
  range_start timestamptz,
  range_end timestamptz,
  issue_focus text,
  markdown text not null,
  model text not null,
  prompt_version text not null,
  input_entry_ids uuid[] not null default '{}',
  usage jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  created_at timestamptz not null default now()
);

create index summary_pet_created_idx on public.summary (pet_id, created_at desc);

alter table public.summary enable row level security;

create policy "summary_select_member"
  on public.summary for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "summary_insert_member"
  on public.summary for insert
  with check (
    author_id = auth.uid()
    and pet_id in (select id from public.pet where household_id in (select public.user_household_ids()))
  );

create policy "summary_update_author"
  on public.summary for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "summary_delete_author"
  on public.summary for delete
  using (author_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'summary-pdf',
  'summary-pdf',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "summary_pdf_select_member"
  on storage.objects for select
  using (
    bucket_id = 'summary-pdf'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );

create policy "summary_pdf_insert_member"
  on storage.objects for insert
  with check (
    bucket_id = 'summary-pdf'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );

create policy "summary_pdf_delete_member"
  on storage.objects for delete
  using (
    bucket_id = 'summary-pdf'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );
