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

## Publicar

- Suba o repositório no GitHub.
- Importe o repositório na Vercel.
- Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Project Settings → Environment Variables**.
- Cada push na branch principal gera um novo deploy automaticamente.

> Os dados deste produto são exclusivamente fictícios e destinados a roleplay. Não use dados policiais reais.
