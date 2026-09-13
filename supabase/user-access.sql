alter table public.profiles
  add column if not exists access_enabled boolean;

update public.profiles
set access_enabled = true
where access_enabled is null;

alter table public.profiles
  alter column access_enabled set default false,
  alter column access_enabled set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, access_enabled)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    false
  );
  return new;
end;
$$;

create index if not exists profiles_access_enabled_idx on public.profiles(access_enabled);

create table if not exists public.user_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_invites enable row level security;

drop policy if exists "administrators can create user invites" on public.user_invites;
create policy "administrators can create user invites"
  on public.user_invites for insert to authenticated
  with check (public.current_user_role() = 'administrador'::public.user_role and created_by = auth.uid());

create index if not exists user_invites_token_idx on public.user_invites(token);
