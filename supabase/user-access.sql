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
