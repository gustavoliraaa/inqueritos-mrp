-- Gera identificadores únicos no banco para os inquéritos.
create sequence if not exists public.investigation_identifier_seq;

create or replace function public.next_investigation_identifier()
returns text
language sql
volatile
as $$
  select 'IP-' || extract(year from now())::text || '-' ||
    lpad(nextval('public.investigation_identifier_seq')::text, 6, '0');
$$;
