create sequence if not exists public.location_identifier_seq;

create or replace function public.next_location_identifier()
returns text
language sql
volatile
as $$
  select 'LOC-' || lpad(nextval('public.location_identifier_seq')::text, 6, '0');
$$;
