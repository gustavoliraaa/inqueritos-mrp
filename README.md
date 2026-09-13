# MRP Intelligence

Sistema fictício de investigação e inteligência para GTA FiveM MRP. O projeto foi estruturado para **GitHub + Vercel + Supabase**.

## Rodar localmente

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as chaves públicas do projeto Supabase.
4. No Supabase, execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor.
5. Execute `npm run dev` e abra `http://localhost:3000`.

## Publicar

- Suba o repositório no GitHub.
- Importe o repositório na Vercel.
- Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Project Settings → Environment Variables**.
- Cada push na branch principal gera um novo deploy automaticamente.

> Os dados deste produto são exclusivamente fictícios e destinados a roleplay. Não use dados policiais reais.
