create table if not exists public.investigation_shares (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.investigation_shares enable row level security;

create or replace function public.create_investigation_share(target_investigation_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.investigations where id = target_investigation_id) then
    raise exception 'investigation_not_found';
  end if;

  update public.investigation_shares
  set revoked_at = now()
  where investigation_id = target_investigation_id
    and revoked_at is null;

  new_token := encode(gen_random_bytes(24), 'base64url');
  insert into public.investigation_shares (investigation_id, token, created_by)
  values (target_investigation_id, new_token, auth.uid());

  return new_token;
end;
$$;

create or replace function public.revoke_investigation_share(target_investigation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.investigation_shares
  set revoked_at = now()
  where investigation_id = target_investigation_id
    and revoked_at is null
    and created_by = auth.uid();
$$;

create index if not exists investigation_shares_token_idx on public.investigation_shares(token);
