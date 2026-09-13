create extension if not exists "pgcrypto";

create type public.user_role as enum ('agente', 'investigador', 'delegado', 'corregedoria', 'administrador');
create type public.case_status as enum ('aberto', 'em_investigacao', 'aguardando_diligencia', 'em_analise', 'concluido', 'arquivado');
create type public.access_level as enum ('normal', 'restrito', 'sigiloso', 'alto_sigilo');
create type public.priority_level as enum ('baixa', 'media', 'alta');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'agente',
  unit text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.investigations (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  title text not null,
  description text,
  unit text not null,
  status public.case_status not null default 'aberto',
  access_level public.access_level not null default 'normal',
  priority public.priority_level not null default 'media',
  origin text,
  responsible_delegate uuid references public.profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid not null references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  name text not null,
  document_id text,
  aliases text[] not null default '{}',
  birth_date date,
  notes text,
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.investigation_people (
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  person_id uuid not null references public.people(id),
  role text not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (investigation_id, person_id, role)
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('vehicle','organization','location','phone','weapon','object','occurrence')),
  identifier text not null,
  name text not null,
  data jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, identifier)
);

create table public.investigation_entities (
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  entity_id uuid not null references public.entities(id),
  relationship text not null,
  context text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (investigation_id, entity_id, relationship)
);

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  investigation_id uuid references public.investigations(id),
  evidence_type text not null,
  title text not null,
  description text,
  storage_path text,
  collected_at timestamptz,
  collected_location text,
  status text not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  title text not null,
  description text,
  assignee uuid references public.profiles(id),
  priority public.priority_level not null default 'media',
  status text not null default 'pendente',
  due_at timestamptz,
  result text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  relationship_type text not null,
  target_type text not null,
  target_id uuid not null,
  investigation_id uuid references public.investigations(id),
  context text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.investigations enable row level security;
alter table public.people enable row level security;
alter table public.investigation_people enable row level security;
alter table public.entities enable row level security;
alter table public.investigation_entities enable row level security;
alter table public.evidences enable row level security;
alter table public.tasks enable row level security;
alter table public.relationships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.timeline_events enable row level security;

create policy "authenticated users can read profiles" on public.profiles for select to authenticated using (true);
create policy "users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "authenticated users can read investigations" on public.investigations for select to authenticated using (true);
create policy "authenticated users can create investigations" on public.investigations for insert to authenticated with check (created_by = auth.uid());
create policy "authenticated users can update investigations" on public.investigations for update to authenticated using (true) with check (true);
create policy "authenticated users can manage investigative data" on public.people for all to authenticated using (true) with check (true);
create policy "authenticated users can manage investigation links" on public.investigation_people for all to authenticated using (true) with check (true);
create policy "authenticated users can manage entities" on public.entities for all to authenticated using (true) with check (true);
create policy "authenticated users can manage entity links" on public.investigation_entities for all to authenticated using (true) with check (true);
create policy "authenticated users can manage evidences" on public.evidences for all to authenticated using (true) with check (true);
create policy "authenticated users can manage tasks" on public.tasks for all to authenticated using (true) with check (true);
create policy "authenticated users can read relationships" on public.relationships for select to authenticated using (true);
create policy "authenticated users can create relationships" on public.relationships for insert to authenticated with check (created_by = auth.uid());
create policy "authenticated users can read audit logs" on public.audit_logs for select to authenticated using (true);
create policy "authenticated users can create audit logs" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());
create policy "authenticated users can read timeline" on public.timeline_events for select to authenticated using (true);
create policy "authenticated users can create timeline" on public.timeline_events for insert to authenticated with check (actor_id = auth.uid());

create index investigations_status_idx on public.investigations(status);
create index people_name_idx on public.people using gin (to_tsvector('simple', name));
create index entities_identifier_idx on public.entities(identifier);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
