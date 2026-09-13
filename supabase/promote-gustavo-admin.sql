-- Promove o primeiro usuário do sistema sem expor ou alterar credenciais.
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
