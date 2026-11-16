-- Willow core schema. Every table belongs to one user: user_id defaults to the signed-in user,
-- and row-level security lets that user, and no one else, read or change the rows.
-- Ids are text because the app creates them on the device; they stay the same after import.

create domain public.goal_key as text
  check (value in ('trading', 'ai', 'glow', 'tech', 'money', 'reading', 'cs'));

create domain public.mood_key as text
  check (value in ('happy', 'peaceful', 'thinking', 'excited', 'neutral', 'sad', 'stressed', 'unproductive', 'tired'));

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  savings_target integer not null default 1000 check (savings_target >= 0),
  demo boolean not null default false,
  scenes jsonb not null default '{"default": "hollow", "home": "pond"}'::jsonb,
  chat_journal boolean not null default false,
  reminders boolean not null default true,
  money_active boolean not null default false,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Photos and screenshots. The bytes live in the private "media" bucket under <user_id>/<id>.jpg.
create table public.media (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  storage_path text not null unique,
  mime_type text not null default 'image/jpeg',
  byte_size integer not null default 0 check (byte_size >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Habits: the daily checklist and the self-care list.
create table public.habits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 100),
  grp text not null default 'custom',
  custom boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row per habit ticked on a day. No foreign key to habits: deleting a habit keeps its past check marks.
create table public.habit_checks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  habit_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, habit_id)
);

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  title text not null check (char_length(title) between 1 and 140),
  done boolean not null default false,
  priority boolean not null default false,
  sort_order integer not null default 0,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index tasks_day_idx on public.tasks (user_id, day);

create table public.events (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  title text not null check (char_length(title) between 1 and 140),
  time_of_day text check (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index events_day_idx on public.events (user_id, day);

create table public.milestones (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  goal_id public.goal_key not null,
  title text not null check (char_length(title) between 1 and 300),
  horizon text not null default '',
  due_day date,
  done boolean not null default false,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index milestones_goal_idx on public.milestones (user_id, goal_id);

create table public.resources (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  goal_id public.goal_key not null,
  title text not null check (char_length(title) between 1 and 300),
  url text not null default '' check (char_length(url) <= 2000),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index resources_goal_idx on public.resources (user_id, goal_id);

-- Activity log. Me Time ticks are activities with me_key set; one tick per item per day.
create table public.activities (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  category text not null,
  goal_id public.goal_key,
  title text not null default 'Activity' check (char_length(title) <= 300),
  minutes integer not null default 0 check (minutes >= 0),
  offline boolean not null default false,
  note text not null default '',
  checklist boolean not null default false,
  me_key text not null default '',
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index activities_day_idx on public.activities (user_id, day);
create unique index activities_me_key_once on public.activities (user_id, day, me_key) where me_key <> '';

-- Goal notes: rich text, a list per goal, pinned notes first.
create table public.goal_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  goal_id public.goal_key not null,
  html text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index goal_notes_goal_idx on public.goal_notes (user_id, goal_id);

create table public.goal_note_photos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id text not null,
  media_id text not null,
  position integer not null default 0,
  primary key (user_id, note_id, media_id),
  foreign key (user_id, note_id) references public.goal_notes (user_id, id) on delete cascade,
  foreign key (user_id, media_id) references public.media (user_id, id) on delete restrict
);

-- The note being written for each goal, saved as the writer types. Photo ids are checked by the app.
create table public.goal_drafts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id public.goal_key not null,
  html text not null default '',
  edit_note_id text,
  photo_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, goal_id)
);

-- Journal: diary entries and quick journal entries.
create table public.journal_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  type text not null default 'daily',
  title text not null default '' check (char_length(title) <= 300),
  body text not null default '',
  html text,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index journal_entries_day_idx on public.journal_entries (user_id, day);

-- Mood per day, with a rich-text note and optional photos.
create table public.day_moods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  mood public.mood_key,
  note text not null default '',
  html text not null default '',
  demo boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.mood_photos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  media_id text not null,
  position integer not null default 0,
  primary key (user_id, day, media_id),
  foreign key (user_id, day) references public.day_moods (user_id, day) on delete cascade,
  foreign key (user_id, media_id) references public.media (user_id, id) on delete restrict
);

-- Pinned days. One list shared by the Mood scrapbook and History.
create table public.day_pins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  pinned_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Savings: deposits and withdrawals are separate rows. Nothing carries over automatically.
create table public.savings_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  amount integer not null check (amount >= 0),
  note text not null default '',
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index savings_entries_day_idx on public.savings_entries (user_id, day);

-- Screen time: one row per day, with its most-used apps as child rows.
create table public.screen_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  total_minutes integer not null check (total_minutes >= 0),
  social_minutes integer not null default 0 check (social_minutes >= 0),
  demo boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.screen_apps (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  position integer not null,
  name text not null check (char_length(name) between 1 and 80),
  minutes integer not null check (minutes >= 0),
  primary key (user_id, day, position),
  foreign key (user_id, day) references public.screen_days (user_id, day) on delete cascade
);

-- Me Time bucket list.
create table public.bucket_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 300),
  category text not null default '',
  note text not null default '',
  done boolean not null default false,
  done_day date,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Tech Lab projects, their progress logs and screenshots.
create table public.projects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 200),
  area text not null default '',
  status text not null default 'Idea' check (status in ('Idea', 'Planning', 'In Progress', 'Testing', 'Completed')),
  repo text not null default '',
  notes text not null default '',
  problems text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.project_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  day date not null,
  text text not null default '',
  html text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);
create index project_logs_project_idx on public.project_logs (user_id, project_id, day);

create table public.project_log_photos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_id text not null,
  media_id text not null,
  position integer not null default 0,
  primary key (user_id, log_id, media_id),
  foreign key (user_id, log_id) references public.project_logs (user_id, id) on delete cascade,
  foreign key (user_id, media_id) references public.media (user_id, id) on delete restrict
);

-- Watch and Read library, plus the personal knowledge library.
create table public.library_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('content', 'knowledge')),
  title text not null check (char_length(title) between 1 and 300),
  category text not null default '',
  status text not null default '',
  url text not null default '' check (char_length(url) <= 2000),
  note text not null default '',
  type text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.wishlist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 300),
  kind text not null default '',
  price integer check (price is null or price >= 0),
  note text not null default '',
  bought boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Clothing orders (Pinduoduo arrivals and other orders).
create table public.clothing_orders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  item text not null check (char_length(item) between 1 and 300),
  store text not null default '',
  order_day date,
  status text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.workouts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  exercise text not null check (char_length(exercise) between 1 and 200),
  sets integer check (sets is null or sets >= 0),
  reps integer check (reps is null or reps >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index workouts_day_idx on public.workouts (user_id, day);

-- CS Student Advantage: monthly courses.
create table public.courses (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 140),
  platform text not null default '',
  lessons_total integer not null default 0 check (lessons_total >= 0),
  lessons_done integer not null default 0,
  status text not null default 'Not started' check (status in ('Not started', 'In progress', 'Completed')),
  started_on date,
  certificate boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (lessons_done >= 0 and lessons_done <= lessons_total)
);

-- Finance Trading: the older trade notes. The backtesting and live trading tables come later.
create table public.trade_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  setup text not null default '',
  outcome text not null default '',
  r_multiple numeric(8, 2),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- AI learning sessions.
create table public.ai_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  day date not null,
  explored text not null default '',
  learned text not null default '',
  configured text not null default '',
  built text not null default '',
  problems text not null default '',
  next_plan text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Willow conversation history.
create table public.chat_messages (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  role text not null check (role in ('me', 'mino', 'note')),
  body text not null default '',
  pending boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Row-level security: each table is readable and writable only by the user who owns the row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings', 'media', 'habits', 'habit_checks', 'tasks', 'events', 'milestones', 'resources',
    'activities', 'goal_notes', 'goal_note_photos', 'goal_drafts', 'journal_entries', 'day_moods',
    'mood_photos', 'day_pins', 'savings_entries', 'screen_days', 'screen_apps', 'bucket_items',
    'projects', 'project_logs', 'project_log_photos', 'library_items', 'wishlist_items',
    'clothing_orders', 'workouts', 'courses', 'trade_records', 'ai_sessions', 'chat_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  end loop;
end $$;

-- Private photo bucket. Each user can only reach files stored under their own user id folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 16777216, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy media_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
