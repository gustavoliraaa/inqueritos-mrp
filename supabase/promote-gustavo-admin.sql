-- Promove o primeiro usuário do sistema sem expor ou alterar credenciais.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "users can update own profile details" on public.profiles;
drop policy if exists "administrators can manage profiles" on public.profiles;

create policy "users can update own profile details" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

create policy "administrators can manage profiles" on public.profiles for update to authenticated
  using (public.current_user_role() = 'administrador'::public.user_role)
  with check (public.current_user_role() = 'administrador'::public.user_role);

update public.profiles
set role = 'administrador'::public.user_role,
    updated_at = now()
where id = (
  select id
  from auth.users
  where lower(email) = lower('uphill.gustavo@gmail.com')
);

-- Confirma o resultado da promoção.
select p.id, u.email, p.full_name, p.role, p.updated_at
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('uphill.gustavo@gmail.com');
