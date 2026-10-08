-- StoryCV: run this once in Supabase → SQL Editor → New query → Run.
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
