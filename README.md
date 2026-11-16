# Mino — Daily Buddy (Willow) backend

Supabase project: `Willow - Daily Buddy` (ap-northeast-1).

## Database

`supabase/migrations/` holds the schema in the order it must run.

- `20261117000000_willow_core_schema.sql` — 31 user-owned tables for the whole Willow app
  (habits, tasks, events, goals, notes, journal, mood, savings, screen time, projects,
  library, wishlist, orders, workouts, courses, AI sessions and chat), plus the private
  `media` photo bucket.

Every table has `user_id`, which defaults to the signed-in user. Row-level security lets a
user read and change only their own rows, and anonymous visitors see nothing. The photo bucket
is private, and each file sits under its owner's user id folder.

Run the migrations in the Supabase SQL editor, or with `supabase db push` once the CLI is set up.

## Keys

Only the publishable key goes in the frontend. Never commit the service-role key or the
database password.
