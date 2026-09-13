create table if not exists public.role_permissions (
  role public.user_role primary key,
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.role_permissions
  add column if not exists can_view boolean not null default true;

alter table public.role_permissions enable row level security;

drop policy if exists "authenticated users can read role permissions"
  on public.role_permissions;

drop policy if exists "administrators can manage role permissions"
  on public.role_permissions;

create policy "authenticated users can read role permissions"
  on public.role_permissions for select to authenticated using (true);

create policy "administrators can manage role permissions"
  on public.role_permissions for all to authenticated
  using (public.current_user_role() = 'administrador'::public.user_role)
  with check (public.current_user_role() = 'administrador'::public.user_role);

insert into public.role_permissions (role, can_view, can_create, can_edit, can_delete)
values
  ('agente', true, true, false, false),
  ('investigador', true, true, true, false),
  ('delegado', true, true, true, true),
  ('corregedoria', true, false, true, false),
  ('administrador', true, true, true, true)
on conflict (role) do nothing;
