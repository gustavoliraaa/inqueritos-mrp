create table if not exists public.system_identity (
  id integer primary key default 1 check (id = 1),
  system_name text not null default 'MRP Intelligence',
  logo_url text,
  primary_color text not null default '#6557d8',
  secondary_color text not null default '#162033',
  accent_color text not null default '#4294cc',
  background_color text not null default '#f5f7fb',
  slug text not null default 'mrp-intelligence',
  browser_name text not null default 'MRP Intelligence',
  share_image_url text,
  share_description text not null default 'Sistema de investigação e inteligência.',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.system_identity (id)
values (1)
on conflict (id) do nothing;

alter table public.system_identity enable row level security;

drop policy if exists "authenticated users can read system identity" on public.system_identity;
drop policy if exists "public can read system identity" on public.system_identity;
drop policy if exists "administrators can insert system identity" on public.system_identity;
drop policy if exists "administrators can update system identity" on public.system_identity;

create policy "authenticated users can read system identity"
on public.system_identity for select
to authenticated
using (true);

create policy "public can read system identity"
on public.system_identity for select
to anon
using (true);

create policy "administrators can insert system identity"
on public.system_identity for insert
to authenticated
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
);

create policy "administrators can update system identity"
on public.system_identity for update
to authenticated
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
);

insert into storage.buckets (id, name, public)
values ('system-assets', 'system-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "authenticated administrators can upload system assets" on storage.objects;
drop policy if exists "authenticated administrators can update system assets" on storage.objects;
drop policy if exists "authenticated administrators can delete system assets" on storage.objects;

create policy "authenticated administrators can upload system assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'system-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
);

create policy "authenticated administrators can update system assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'system-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
)
with check (
  bucket_id = 'system-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
);

create policy "authenticated administrators can delete system assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'system-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'administrador')
);
