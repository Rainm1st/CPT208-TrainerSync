-- Run this in: Supabase Dashboard → SQL Editor → New Query

create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique not null,
  role        text not null check (role in ('trainee', 'coach')),
  avatar_url  text,
  bio         text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

-- Any logged-in user can read any profile (needed for map, chat)
create policy "profiles: read any"
  on profiles for select
  to authenticated
  using (true);

-- Users can only create their own row
create policy "profiles: insert own"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only edit their own row
create policy "profiles: update own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
