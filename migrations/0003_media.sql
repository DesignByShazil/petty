-- Petty — media (Task 3)
-- Storage bucket, media table, storage RLS, and cascade trigger

-- Storage bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-media',
  'pet-media',
  false,
  104857600, -- 100 MB
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

-- media table
create table public.media (
  id uuid primary key default gen_random_uuid(),
  log_entry_id uuid not null references public.log_entry(id) on delete cascade,
  pet_id uuid not null references public.pet(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  width int,
  height int,
  duration_seconds numeric,
  size_bytes bigint not null,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index media_log_entry_idx on public.media(log_entry_id);
create index media_pet_idx on public.media(pet_id);

alter table public.media enable row level security;

create policy "media_read" on public.media for select
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "media_insert" on public.media for insert
  with check (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

create policy "media_delete" on public.media for delete
  using (pet_id in (select id from public.pet where household_id in (select public.user_household_ids())));

-- Delete the storage object when the media row is deleted.
create or replace function public.handle_media_delete()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'pet-media' and name = old.storage_path;
  return old;
end;
$$;

create trigger media_delete_cascade
  after delete on public.media
  for each row execute function public.handle_media_delete();

-- Storage RLS: gate pet-media by household membership. Path format: {pet_id}/{filename}
create policy "pet-media read"
  on storage.objects for select
  using (
    bucket_id = 'pet-media'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );

create policy "pet-media insert"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-media'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );

create policy "pet-media delete"
  on storage.objects for delete
  using (
    bucket_id = 'pet-media'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.pet where household_id in (select public.user_household_ids())
    )
  );
