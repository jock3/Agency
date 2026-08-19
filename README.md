# Mediaplan

Next.js-app för att bygga, dela och exportera mediaplaner.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Supabase (Postgres + RPC-baserad auth)

## Utveckling

```bash
npm install
npm run dev     # http://localhost:3001
```

Kräver `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Auth

Inloggning sker med namn + 6-siffrig PIN mot Supabase-funktionerna `app_login`
och `app_signup`. PIN-koder lagras bcrypt-hashade; fem felaktiga försök låser
kontot i 15 minuter. Adminfunktioner ligger under `/admin`.

## Deploy

Vercel bygger från `main` via Git-integrationen. Root Directory är repots rot.
