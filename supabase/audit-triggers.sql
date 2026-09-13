create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, field_name, old_value, new_value, reason)
    values (
      coalesce(auth.uid(), new.created_by),
      'create',
      tg_table_name,
      new.id,
      null,
      null,
      to_jsonb(new),
      'Registro criado'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, field_name, old_value, new_value, reason)
    values (
      coalesce(auth.uid(), new.created_by, old.created_by),
      'update',
      tg_table_name,
      new.id,
      null,
      to_jsonb(old),
      to_jsonb(new),
      'Registro atualizado'
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, field_name, old_value, new_value, reason)
    values (
      coalesce(auth.uid(), old.created_by),
      'delete',
      tg_table_name,
      old.id,
      null,
      to_jsonb(old),
      null,
      'Registro removido'
    );
    return old;
  end if;

  return null;
end;
$$;

create or replace trigger investigations_audit_trigger
after insert or update of title, description, status, priority, unit, access_level, responsible_delegate, updated_at or delete on public.investigations
for each row execute function public.log_audit_change();

create or replace trigger people_audit_trigger
after insert or update of name, document_id, aliases, birth_date, notes, status, updated_at or delete on public.people
for each row execute function public.log_audit_change();

create or replace trigger entities_audit_trigger
after insert or update of name, entity_type, data, identifier, updated_at or delete on public.entities
for each row execute function public.log_audit_change();

create or replace trigger evidences_audit_trigger
after insert or update of title, description, evidence_type, status, storage_path, investigation_id, collected_location, collected_at, updated_at or delete on public.evidences
for each row execute function public.log_audit_change();

create or replace trigger tasks_audit_trigger
after insert or update of title, description, assignee, priority, status, due_at, result, updated_at or delete on public.tasks
for each row execute function public.log_audit_change();
