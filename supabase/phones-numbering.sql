create sequence if not exists public.phone_identifier_seq;

create or replace function public.next_phone_identifier()
returns text
language sql
volatile
as $$
  select 'TEL-' || lpad(nextval('public.phone_identifier_seq')::text, 6, '0');
$$;
