insert into storage.buckets (id, name, public)
values ('evidence-files', 'evidence-files', false)
on conflict (id) do update set public = false;

create policy "authenticated users can read evidence files"
on storage.objects for select
to authenticated
using (bucket_id = 'evidence-files');

create policy "authenticated users can upload evidence files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'evidence-files');

create policy "authenticated users can update evidence files"
on storage.objects for update
to authenticated
using (bucket_id = 'evidence-files')
with check (bucket_id = 'evidence-files');

create policy "authenticated users can delete evidence files"
on storage.objects for delete
to authenticated
using (bucket_id = 'evidence-files');
