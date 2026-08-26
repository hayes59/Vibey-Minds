-- vibeyminds schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'chatter')),
  is_online boolean not null default false,
  rate_per_message integer, -- cents; only meaningful when role = 'chatter'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  constraint distinct_users check (user_a <> user_b),
  constraint unique_pair unique (user_a, user_b)
);

alter table public.matches enable row level security;

create policy "Participants can view their matches"
  on public.matches for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can create a match they belong to"
  on public.matches for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "Participants can update their matches"
  on public.matches for update
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_match_id_created_at_idx
  on public.messages (match_id, created_at);

alter table public.messages enable row level security;

create policy "Participants can view messages in their matches"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Participants can send messages in their active matches"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'active'
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- realtime: broadcast INSERTs on messages (and presence-ish updates on
-- matches/profiles) to subscribed clients
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.credit_balances;

-- ---------------------------------------------------------------------------
-- credit_balances — each user's spendable credit balance
-- ---------------------------------------------------------------------------
create table if not exists public.credit_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0), -- in credits
  updated_at timestamptz not null default now()
);

alter table public.credit_balances enable row level security;

create policy "Users can view their own balance"
  on public.credit_balances for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update policy for regular users: balances are only ever
-- written by the webhook/server using the service role key, which
-- bypasses RLS. This stops a client from crediting itself directly.

-- ---------------------------------------------------------------------------
-- credit_transactions — ledger of deposits and spends
-- ---------------------------------------------------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null, -- positive = deposit, negative = spend
  kind text not null check (kind in ('crypto_deposit', 'message_spend', 'chatter_earning', 'adjustment')),
  provider text, -- e.g. 'nowpayments', 'coinbase_commerce', 'btcpay'
  provider_ref text, -- provider's invoice/payment id, for idempotency
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create unique index if not exists credit_transactions_provider_ref_idx
  on public.credit_transactions (provider, provider_ref)
  where provider_ref is not null;

alter table public.credit_transactions enable row level security;

create policy "Users can view their own transactions"
  on public.credit_transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes to credit_transactions happen server-side only (service role),
-- same rationale as credit_balances above.

-- ---------------------------------------------------------------------------
-- convenience trigger: auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'New user'));
  insert into public.credit_balances (user_id, balance)
  values (new.id, 0);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- apply_credit_transaction — atomically records a ledger entry and adjusts
-- the balance. Call this from server-side code only (service role), never
-- from the browser. provider_ref + the unique index above make deposit
-- webhooks idempotent: replaying the same provider event is a no-op.
-- ---------------------------------------------------------------------------
create or replace function public.apply_credit_transaction(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_provider text default null,
  p_provider_ref text default null
) returns void as $$
begin
  if p_provider_ref is not null then
    if exists (
      select 1 from public.credit_transactions
      where provider = p_provider and provider_ref = p_provider_ref
    ) then
      return; -- already processed this provider event
    end if;
  end if;

  insert into public.credit_transactions (user_id, amount, kind, provider, provider_ref, status)
  values (p_user_id, p_amount, p_kind, p_provider, p_provider_ref, 'completed');

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, greatest(p_amount, 0))
  on conflict (user_id)
  do update set balance = public.credit_balances.balance + p_amount,
                updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;
