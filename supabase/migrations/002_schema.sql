-- ══════════════════════════════════════════════════════════
-- 002_schema.sql  — TrainerSync full data schema
-- Run in: Supabase Dashboard → SQL Editor
-- NOTE: Disable email confirmation for dev:
--   Auth → Email → "Confirm email" toggle OFF
-- ══════════════════════════════════════════════════════════

-- ── Sessions ──────────────────────────────────────────────
create table if not exists sessions (
  id            uuid        default gen_random_uuid() primary key,
  trainee_id    uuid        references profiles(id) on delete cascade not null,
  exercise_name text        not null,
  exercise_id   text,
  started_at    timestamptz default now() not null,
  ended_at      timestamptz,
  duration_s    integer,
  avg_hr        integer,
  max_hr        integer,
  sets_done     integer
);

alter table sessions enable row level security;

create policy "sessions: trainee crud own"
  on sessions for all to authenticated
  using (auth.uid() = trainee_id)
  with check (auth.uid() = trainee_id);

create policy "sessions: authenticated read all"
  on sessions for select to authenticated
  using (true);

-- ── HR Samples ────────────────────────────────────────────
create table if not exists hr_samples (
  id         bigserial    primary key,
  session_id uuid         references sessions(id) on delete cascade not null,
  bpm        integer      not null,
  sampled_at timestamptz  default now() not null
);

alter table hr_samples enable row level security;

create policy "hr_samples: trainee crud own via session"
  on hr_samples for all to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.id = hr_samples.session_id and s.trainee_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = hr_samples.session_id and s.trainee_id = auth.uid()
    )
  );

create policy "hr_samples: authenticated read all"
  on hr_samples for select to authenticated
  using (true);

-- ── Live Session Presence ─────────────────────────────────
-- One row per active trainee — upserted every few seconds, deleted on session end
create table if not exists session_presence (
  trainee_id    uuid        references profiles(id) on delete cascade primary key,
  session_id    uuid        references sessions(id) on delete cascade,
  exercise_name text,
  current_set   integer     default 0,
  current_hr    integer     default 0,
  updated_at    timestamptz default now()
);

alter table session_presence enable row level security;

create policy "presence: read all"
  on session_presence for select to authenticated
  using (true);

create policy "presence: trainee upsert own"
  on session_presence for insert to authenticated
  with check (auth.uid() = trainee_id);

create policy "presence: trainee update own"
  on session_presence for update to authenticated
  using (auth.uid() = trainee_id);

create policy "presence: trainee delete own"
  on session_presence for delete to authenticated
  using (auth.uid() = trainee_id);

-- ── Coach ↔ Trainee ───────────────────────────────────────
create table if not exists coach_trainees (
  coach_id    uuid references profiles(id) on delete cascade,
  trainee_id  uuid references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (coach_id, trainee_id)
);

alter table coach_trainees enable row level security;

create policy "coach_trainees: read own"
  on coach_trainees for select to authenticated
  using (auth.uid() = coach_id or auth.uid() = trainee_id);

create policy "coach_trainees: coach insert"
  on coach_trainees for insert to authenticated
  with check (auth.uid() = coach_id);

create policy "coach_trainees: coach delete"
  on coach_trainees for delete to authenticated
  using (auth.uid() = coach_id);

-- ── Friendships ───────────────────────────────────────────
create table if not exists friendships (
  id           uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) on delete cascade not null,
  addressee_id uuid references profiles(id) on delete cascade not null,
  status       text not null check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table friendships enable row level security;

create policy "friendships: read own"
  on friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships: requester insert"
  on friendships for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships: parties update"
  on friendships for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── Interactions (cheers + emoji bursts) ──────────────────
create table if not exists interactions (
  id          uuid default gen_random_uuid() primary key,
  sender_id   uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  type        text not null check (type in ('cheer', 'emoji')),
  payload     text not null,
  sent_at     timestamptz default now()
);

alter table interactions enable row level security;

create policy "interactions: sender insert"
  on interactions for insert to authenticated
  with check (auth.uid() = sender_id);

create policy "interactions: parties read"
  on interactions for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create index if not exists interactions_receiver_idx on interactions (receiver_id);

-- ── Messages ──────────────────────────────────────────────
create table if not exists messages (
  id          uuid default gen_random_uuid() primary key,
  sender_id   uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  body        text not null,
  sent_at     timestamptz default now(),
  read_at     timestamptz
);

alter table messages enable row level security;

create policy "messages: parties read"
  on messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages: sender insert"
  on messages for insert to authenticated
  with check (auth.uid() = sender_id);

create index if not exists messages_receiver_idx on messages (receiver_id);
create index if not exists messages_sender_idx   on messages (sender_id);

-- ── Enable Realtime ───────────────────────────────────────
alter publication supabase_realtime add table session_presence;
alter publication supabase_realtime add table interactions;
alter publication supabase_realtime add table messages;
