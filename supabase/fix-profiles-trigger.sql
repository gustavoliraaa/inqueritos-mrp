-- Corrige a criação automática de perfis e recupera usuários já cadastrados.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cria perfis para contas que foram cadastradas antes do trigger.
insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(u.email, 'usuario'), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

-- Promove o primeiro administrador solicitado.
update public.profiles
set role = 'administrador'::public.user_role,
    updated_at = now()
where id in (
  select id
  from auth.users
  where lower(email) = lower('uphill.gustavo@gmail.com')
);

-- Validação: deve retornar uma linha com role = administrador.
select p.id, u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('uphill.gustavo@gmail.com');
