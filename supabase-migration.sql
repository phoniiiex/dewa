-- Run this in your Supabase SQL Editor to enable the users/onboarding feature

-- 1. onboarding_tokens table: stores invite tokens before users complete registration
create table if not exists public.onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text not null,
  role text not null default 'REP',
  permissions text[] not null default '{}',
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS: only service role can read/write (server-side API routes use service key)
alter table public.onboarding_tokens enable row level security;
-- No public access - all access is via API routes with service role key

-- 2. Make sure profiles table has permissions column
alter table public.profiles
  add column if not exists permissions text[] not null default '{}';

-- 3. Index for fast token lookups
create index if not exists idx_onboarding_tokens_token on public.onboarding_tokens(token);
create index if not exists idx_onboarding_tokens_email on public.onboarding_tokens(email);

-- Done! ✅
