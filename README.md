# MRP Intelligence

Sistema fictício de investigação e inteligência para GTA FiveM MRP. O projeto foi estruturado para **GitHub + Vercel + Supabase**.

## Rodar localmente

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as chaves públicas do projeto Supabase.
4. No Supabase, execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor.
5. Execute `npm run dev` e abra `http://localhost:3000`.

## Autenticação

O cadastro e login usam o Supabase Auth. O banco cria automaticamente um registro
em `public.profiles` para cada novo usuário. Em um projeto Supabase já existente,
execute novamente o arquivo [`supabase/schema.sql`](./supabase/schema.sql) para
aplicar o trigger de criação de perfil e as políticas atualizadas.

No painel do Supabase, configure em **Authentication → URL Configuration**:

- **Site URL**: a URL da Vercel em produção.
- **Redirect URLs**: `https://seu-dominio.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`.

Para promover o primeiro usuário a administrador, execute uma vez o arquivo
[`supabase/promote-gustavo-admin.sql`](./supabase/promote-gustavo-admin.sql) no
SQL Editor do Supabase. O último `select` deve retornar o usuário com `role`
igual a `administrador`.

Se um usuário aparecer em **Authentication → Users**, mas não aparecer em
`public.profiles`, execute [`supabase/fix-profiles-trigger.sql`](./supabase/fix-profiles-trigger.sql).
Essa migração corrige o trigger e cria os perfis que ficaram faltando.

Para habilitar a numeração automática dos inquéritos, execute
[`supabase/investigations-numbering.sql`](./supabase/investigations-numbering.sql)
uma vez no SQL Editor. Depois disso, a página `/investigations` permite listar e
criar inquéritos persistidos no Supabase.

Para habilitar a numeração automática de pessoas, execute
[`supabase/people-numbering.sql`](./supabase/people-numbering.sql) uma vez no
SQL Editor. A página `/people` permite cadastrar e editar a base central.

Para habilitar identificadores automáticos de veículos, execute
[`supabase/vehicles-numbering.sql`](./supabase/vehicles-numbering.sql) uma vez
no SQL Editor. O módulo está disponível em `/vehicles`.

O cadastro de organizações está disponível em `/organizations` e utiliza a
tabela central `entities` com `entity_type = organization`.

Para habilitar identificadores automáticos de locais, execute
[`supabase/locations-numbering.sql`](./supabase/locations-numbering.sql) uma vez
no SQL Editor. O módulo está disponível em `/locations` e utiliza a tabela
central `entities` com `entity_type = location`.

Para habilitar identificadores automáticos de telefones, execute
[`supabase/phones-numbering.sql`](./supabase/phones-numbering.sql) uma vez no
SQL Editor. O módulo está disponível em `/phones` e utiliza a tabela central
`entities` com `entity_type = phone`.

Para habilitar identificadores automáticos de evidências, execute
[`supabase/evidences-numbering.sql`](./supabase/evidences-numbering.sql) uma vez
no SQL Editor. O módulo está disponível em `/evidences` e permite vincular cada
registro a um inquérito.

Para habilitar anexos de evidências, execute
[`supabase/evidence-storage.sql`](./supabase/evidence-storage.sql) uma vez no
SQL Editor. O bucket `evidence-files` é privado; a aplicação gera links
temporários para usuários autenticados.

Para habilitar as liberações de funcionalidades por cargo, execute
[`supabase/role-permissions.sql`](./supabase/role-permissions.sql) uma vez no
SQL Editor. A página `/settings/users`, disponível para administradores, permite
configurar somente as ações de criar, editar e excluir para os cargos padrão.

## Publicar

- Suba o repositório no GitHub.
- Importe o repositório na Vercel.
- Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Project Settings → Environment Variables**.
- Cada push na branch principal gera um novo deploy automaticamente.

> Os dados deste produto são exclusivamente fictícios e destinados a roleplay. Não use dados policiais reais.
