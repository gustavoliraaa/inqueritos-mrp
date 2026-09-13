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
  role public.user_role not null default 'agente'::public.user_role,
  max_uses integer not null default 1 check (max_uses between 1 and 1000),
  uses_count integer not null default 0 check (uses_count >= 0),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_invites add column if not exists role public.user_role not null default 'agente'::public.user_role;
alter table public.user_invites add column if not exists max_uses integer not null default 1;
alter table public.user_invites add column if not exists uses_count integer not null default 0;
update public.user_invites set max_uses = 1 where max_uses is null or max_uses < 1;
update public.user_invites set uses_count = case when used_at is null then 0 else 1 end where uses_count is null;
alter table public.user_invites drop constraint if exists user_invites_max_uses_check;
alter table public.user_invites add constraint user_invites_max_uses_check check (max_uses between 1 and 1000);
alter table public.user_invites drop constraint if exists user_invites_uses_count_check;
alter table public.user_invites add constraint user_invites_uses_count_check check (uses_count >= 0);

alter table public.user_invites enable row level security;

drop policy if exists "administrators can create user invites" on public.user_invites;
create policy "administrators can create user invites"
  on public.user_invites for insert to authenticated
  with check (public.current_user_role() = 'administrador'::public.user_role and created_by = auth.uid());

create index if not exists user_invites_token_idx on public.user_invites(token);

create or replace function public.claim_user_invite(invite_token text)
returns table (invite_id uuid, invited_role public.user_role)
language sql
security definer
set search_path = public
as $$
  update public.user_invites
  set uses_count = uses_count + 1,
      used_at = case when uses_count + 1 >= max_uses then now() else used_at end
  where token = invite_token
    and uses_count < max_uses
    and expires_at > now()
  returning id, role;
$$;

create or replace function public.release_user_invite(invite_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_invites
  set uses_count = uses_count - 1,
      used_at = null
  where id = invite_id
    and uses_count > 0;
$$;
