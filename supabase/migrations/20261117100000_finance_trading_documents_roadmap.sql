-- Finance Trading makeover, stage 1: documents (Concepts and Platforms now, Backtesting Logger later)
-- and the learning roadmap. Milestones, activities, notes and resources reuse the core tables.
-- Every table is owned by one user; composite foreign keys also stop a row pointing at another user's parent.

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- A document is a library entry; its text lives in pages so one document can have many pages.
create table public.trading_documents (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('concept', 'backtest')),
  title text not null default 'Untitled document' check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default '' check (char_length(category) <= 80),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, id)
);
create index trading_documents_lib_idx on public.trading_documents (user_id, kind, archived, updated_at desc);

create table public.trading_document_pages (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null,
  position integer not null default 0 check (position >= 0),
  -- Editor content as ProseMirror/Tiptap JSON. Images reference media ids, never raw bytes.
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id, document_id) references public.trading_documents (user_id, id) on delete cascade
);
create index trading_document_pages_doc_idx on public.trading_document_pages (user_id, document_id, position);

-- Learning roadmap: topics with subtopics.
create table public.roadmap_topics (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  position integer not null default 0,
  collapsed boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, id)
);
create index roadmap_topics_idx on public.roadmap_topics (user_id, position);

create table public.roadmap_subtopics (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  position integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id, topic_id) references public.roadmap_topics (user_id, id) on delete cascade
);
create index roadmap_subtopics_idx on public.roadmap_subtopics (user_id, topic_id, position);

create trigger trading_documents_touch before update on public.trading_documents
  for each row execute function public.touch_updated_at();
create trigger trading_document_pages_touch before update on public.trading_document_pages
  for each row execute function public.touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['trading_documents', 'trading_document_pages', 'roadmap_topics', 'roadmap_subtopics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  end loop;
end $$;
