-- Ceritain: run this in Supabase → SQL Editor → New query → Run.
-- It creates a small table that counts how much each user chats per day,
-- so nobody can overuse (and overspend) the AI.

create table if not exists public.chat_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default ((now() at time zone 'Asia/Jakarta')::date),
  messages int  not null default 0,
  resumes  int  not null default 0,
  primary key (user_id, day)
);

-- Lock the table: only the website's server can read or change it.
alter table public.chat_usage enable row level security;

create or replace function public.bump_usage(p_user uuid, p_kind text)
returns table (messages int, resumes int)
language sql
security definer
set search_path = public
as $$
  insert into public.chat_usage as cu (user_id, day, messages, resumes)
  values (
    p_user,
    (now() at time zone 'Asia/Jakarta')::date,
    case when p_kind = 'message' then 1 else 0 end,
    case when p_kind = 'resume'  then 1 else 0 end
  )
  on conflict (user_id, day) do update
    set messages = cu.messages + excluded.messages,
        resumes  = cu.resumes  + excluded.resumes
  returning cu.messages, cu.resumes;
$$;

revoke all on function public.bump_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.bump_usage(uuid, text) to service_role;

-- ===== Part 2: saved CVs (added later; running this whole file again is safe) =====
-- Every CV is kept in the user's account, so it survives a phone change,
-- and "paid" can only be switched on by the website's server.
create table if not exists public.cvs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  buddy       text,
  profile     jsonb,
  messages    jsonb,
  resume      jsonb,
  paid        boolean not null default false,
  paid_at     timestamptz,
  payment_ref text
);
create index if not exists cvs_user_idx on public.cvs (user_id, updated_at desc);

-- Lock the table: no rules for visitors, so only the server (secret key) can read or change it.
alter table public.cvs enable row level security;
