# vibeyminds

A Next.js (App Router) + Supabase chat platform: people create a profile,
match with someone, and chat in real time.

## Stack
- Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS
- Supabase: Postgres + Auth (email/password) + Realtime

## Tables
- `profiles` — one row per user (`member` or `chatter` role), created
  automatically on signup via a Postgres trigger.
- `matches` — a pairing between two profiles, with a `status`
  (`pending` / `active` / `ended`).
- `messages` — messages belonging to a match. Row Level Security only lets
  the two participants in a match read or write its messages.

All three tables are added to the `supabase_realtime` publication, and the
chat UI subscribes to Postgres `INSERT` events on `messages` filtered by
`match_id`, so new messages appear instantly for both participants without a
page refresh.

## Setup

1. Create a project at https://supabase.com.
2. In the SQL editor, run `supabase/schema.sql` from this repo. It creates
   the tables, RLS policies, the realtime publication entries, and the
   `handle_new_user` trigger.
3. In **Project Settings → API**, copy the Project URL and anon public key
   into `.env.local` (copy `.env.example` as a starting point):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
   ```

4. In **Authentication → URL Configuration**, add
   `http://localhost:3000/api/auth/callback` (and your production URL) as a
   redirect URL.
5. Install dependencies and run the dev server:

   ```
   npm install
   npm run dev
   ```

6. Open http://localhost:3000, sign up two different accounts (e.g. in a
   normal window and an incognito window), go to **Matches**, click
   **Start chat** from one account, and send messages — they should appear
   instantly in both windows.

## Verified locally
- `npx tsc --noEmit` — no errors
- `npx eslint .` — no errors
- `npm run build` — production build succeeds, all routes compile
- Smoke-tested the built app with `next start`: public pages return 200,
  `/matches`, `/credits`, `/chat/*` redirect unauthenticated users to
  `/login` (307), `/api/credits/checkout` returns 401 without a session,
  and `/api/credits/webhook` correctly rejects unsigned requests (401)
  rather than trusting them

## Credits (crypto deposits)

Users don't buy crypto on vibeyminds — they bring USDT they already hold
(from any wallet or exchange) and convert it into in-app credits. The flow:

1. `/credits` shows the user's balance (`credit_balances` table) and a
   package picker (`BuyCreditsPanel.tsx`).
2. Picking a package calls `POST /api/credits/checkout`, which asks a
   **crypto payment processor** (not code you host yourself) to create an
   invoice and returns its hosted checkout URL.
3. The user sends USDT from their own wallet on that hosted page.
4. Once the processor confirms the on-chain payment, it calls
   `POST /api/credits/webhook`, which verifies the request is really from
   the processor (signature check) and then calls the
   `apply_credit_transaction` Postgres function with the service-role
   client to credit the user's balance.
5. The balance UI updates live via a Supabase realtime subscription on
   `credit_balances` — no page refresh needed.

**You need to pick a processor and fill in `src/lib/payments/provider.ts`**
(NOWPayments, Coinbase Commerce, and BTCPay Server are all common choices,
with example code left in comments there). Until you do, `CRYPTO_PROVIDER_API_KEY`
stays unset and the checkout button redirects to a local
`/credits/dev-checkout` simulator so you can see the whole flow end-to-end —
delete that route once a real processor is wired up.

Why go through a processor instead of generating deposit addresses and
holding private keys yourself: that's custody, and a bug or a leaked env
var there means stolen customer funds directly, whereas a processor takes
on address generation, confirmation/reorg handling, and (with most
providers) basic AML screening. `credit_balances` and `credit_transactions`
are only ever written server-side with the service-role key — the RLS
policies give regular users read-only access to their own rows, so a
client can't credit itself directly no matter what it sends the browser.

## Notes on the business model
This scaffold supports the "pay-per-message chatter" model (a `chatter`
role with a `rate_per_message` on their profile), but doesn't yet deduct
credits per message or pay chatters out — that logic (spend on send,
chatter earning splits, payout requests) is the natural next piece to add
on top of the `credit_transactions` ledger. Age verification / KYC and
which jurisdictions you can legally operate a paid companionship service in
are compliance questions worth reviewing with a lawyer, separate from the
code itself.
