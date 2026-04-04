# Invoice Manager — Next.js App

## Project Context
This is a multi-user invoice manager built with Next.js (App Router), next-auth (Gmail OAuth), MongoDB, pdf-lib, and vanilla CSS.

## Architecture
- **Auth**: Gmail OAuth via next-auth v4 + MongoDBAdapter
- **Middleware**: Route protection for `/create` and `/view` via `middleware.ts`
- **DB**: MongoDB — collections: `invoices`, `accounts`, `sessions`, `users`
- **PDF**: pdf-lib (server-side, on-the-fly, high performance — no external storage)
- **Invoice IDs**: UUID v4 (uuid package)
- **Styling**: Vanilla CSS (no Tailwind) — global CSS variables, glass-morphism
- **User isolation**: Every API route checks `session.user.id === invoice.userId`

## Directory Structure
```
next-invoice/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   ← Gmail OAuth
│   │   ├── invoices/
│   │   │   ├── route.ts                  ← GET list, POST create
│   │   │   ├── [id]/route.ts             ← GET, PUT, DELETE by UUID
│   │   │   └── public/[invNo]/route.ts   ← Public PDF download (pdf-lib)
│   ├── create/page.tsx                   ← Protected invoice form
│   ├── view/page.tsx                     ← Protected records table
│   ├── login/page.tsx                    ← Login page
│   ├── page.tsx                          ← Public lookup page
│   ├── globals.css                       ← All CSS (vanilla)
│   └── layout.tsx
├── lib/
│   ├── mongodb.ts                        ← MongoClient singleton
│   ├── auth.ts                           ← NextAuth options (re-usable)
│   ├── pdfGenerator.ts                   ← pdf-lib invoice generator
│   └── models/
│       └── Invoice.ts                    ← TypeScript interfaces
├── components/
│   ├── Header.tsx
│   ├── FormCard.tsx
│   ├── DeductionTable.tsx
│   ├── SummaryBox.tsx
│   ├── RecordsTable.tsx
│   └── InvoiceModal.tsx
├── .env.local                            ← Fill in your secrets
└── CLAUDE.md                             ← This file
```

## ENV Variables (fill in .env.local)
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32-char string>
MONGODB_URI=mongodb+srv://...
MONGODB_DB=invoice_manager
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Google OAuth Setup
1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret into .env.local

## Key Design Decisions
- **No external PDF storage** — PDF generated fresh every time from DB data
- **Public PDF route** (`/api/invoices/public/[invNo]`) — works without login; requires correct invNo AND matching email (passed as query param for public use)
- **User isolation** — enforced in every route handler; no shared data
- **CSS variables** — `--ink`, `--paper`, `--accent`, `--accent2`, `--border`, etc.

## Running
```
pnpm dev
```
