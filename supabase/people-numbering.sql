-- Gera identificadores únicos para o cadastro central de pessoas.
create sequence if not exists public.people_identifier_seq;

create or replace function public.next_person_identifier()
returns text
language sql
volatile
as $$
  select 'CID-' || lpad(nextval('public.people_identifier_seq')::text, 6, '0');
$$;
