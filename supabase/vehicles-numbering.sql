-- Identificador técnico para veículos sem placa conhecida.
create sequence if not exists public.vehicle_identifier_seq;

create or replace function public.next_vehicle_identifier()
returns text
language sql
volatile
as $$
  select 'VEI-' || lpad(nextval('public.vehicle_identifier_seq')::text, 6, '0');
$$;
