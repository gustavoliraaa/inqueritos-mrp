create sequence if not exists public.evidence_identifier_seq;

create or replace function public.next_evidence_identifier()
returns text
language sql
volatile
as $$
  select 'EVD-' || lpad(nextval('public.evidence_identifier_seq')::text, 6, '0');
$$;
