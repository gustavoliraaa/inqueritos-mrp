-- Remove registros operacionais de demonstração sem apagar usuários,
-- permissões ou a estrutura do banco.
begin;

truncate table
  public.timeline_events,
  public.audit_logs,
  public.relationships,
  public.investigation_entities,
  public.investigation_people,
  public.tasks,
  public.evidences,
  public.entities,
  public.people,
  public.investigations
restart identity cascade;

-- Convites antigos também são dados temporários de implantação.
truncate table public.user_invites restart identity;

-- O Supabase bloqueia exclusões diretas em storage.objects.
-- Para remover arquivos do bucket "evidences", use o Storage do painel
-- Supabase ou a Storage API antes/depois de executar este script.

commit;
