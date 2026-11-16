# Mino / Willow — handoff

Read this first. It was written on 2026-11-17 so a new chat can pick up the work.

## What exists

- **Willow (the current app).** A single-page vanilla JavaScript app. It is also published as an artifact at https://claude.ai/artifact/VcamYHARQTHo82e4wTP5Ce (version 28). Its source is in `legacy/willow/`. Its browser tests are in `legacy/tests/`.
- **Where Willow keeps data today.** In the browser's storage on the device (key `mino.state.v2`), plus the artifact's own shared database. Photos sit in the browser's IndexedDB and never leave the device.
- **Supabase project.** `Willow - Daily Buddy`, id `bytcbxiomfycsxikcpzo`, region ap-northeast-1. The schema is in `supabase/migrations/20261117000000_willow_core_schema.sql`.
  - 31 user-owned tables. Each has `user_id`, which defaults to `auth.uid()`.
  - Row-level security is on for every table. Anonymous visitors see nothing.
  - A private `media` bucket stores photos at `<user_id>/<id>.jpg`.
  - Row-level security was tested with two throwaway users: 10 of 10 checks passed. The security advisor reports no issues.
- **One leftover record.** Testing left an empty storage record at `aaaaaaaa-0000-4000-8000-00000000000a/rls-test.jpg` in the `media` bucket. Its user was deleted and it holds no image. Delete it from the Storage tab in the Supabase dashboard. The Storage API blocks deleting it from SQL.
- **The original spec.** `docs/mino-original-spec.txt` is the Mino spec the user wrote.

## Decisions made

- **Target stack** (from the Mino 2.0 spec): Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth, Postgres with RLS, Supabase Storage, Recharts. Hosting on Vercel is planned.
- **Sign-in.** Email and password, for the owner only. Sign-up is closed once the owner's account exists.
- **Ids.** Records keep the text ids the app creates, so import keeps them. The primary key is `(user_id, id)`.
- **Habit checks have no foreign key to habits.** Deleting a habit keeps its past check marks, which the app promises.
- **Photos.** Each photo is one row in `media`, and the bytes sit in the bucket. Link tables such as `mood_photos` use `on delete restrict`, so a photo can't be deleted while it is still linked.
- **Keys.** Only the publishable key goes in the frontend. Never commit the service-role key or the database password.
- **Scope.** Port all of Willow first. Then build Finance Trading Parts 1–2 from the brief below.

## Status

- Done: the repo, the schema and the RLS tests.
- Blocked: package installs. In the original chat the npm registry was refused. Package installs are controlled in **Settings → Capabilities → "Use the internet while making files"**. Check it first in a new chat with `npm view next version`. It should print a version number.
- Not started: the Next.js app, sign-in, the pages, the data import, Finance Trading.

## Next steps, in order

1. Confirm npm works. Scaffold the Next.js app at the repo root: TypeScript, Tailwind CSS and the App Router.
2. Add the Supabase client. Use the project URL `https://bytcbxiomfycsxikcpzo.supabase.co` and the publishable key, loaded from environment variables.
3. Build sign-in.
4. Port each Willow page. Compare it with `legacy/willow/`, then run the matching checks from `legacy/tests/` against the new app.
5. Build a one-time import. It reads `mino.state.v2` from localStorage, uploads the IndexedDB photos to the `media` bucket, and inserts the rows. Keep the local copy until the import is checked.
6. Build Finance Trading Parts 1–2 from the brief in the Finance Trading section below.

## Willow data → tables

| Willow state key | Table(s) |
|---|---|
| `settings` | `user_settings` (extra keys in `extra`) |
| `habits` | `habits` |
| `habitChecks[day][habitId]` | `habit_checks` |
| `tasks` | `tasks` |
| `events` | `events` |
| `milestones` | `milestones` |
| `resources` | `resources` |
| `activities` (Me Time ticks have `meKey`) | `activities` |
| `goalNotes[goal]` and their photos | `goal_notes`, `goal_note_photos` |
| `goalDrafts[goal]` | `goal_drafts` |
| `journal` | `journal_entries` |
| `moods[day]` and their photos | `day_moods`, `mood_photos` |
| `pins[day]` | `day_pins` |
| `savings` | `savings_entries` |
| `screen[day]` and its apps | `screen_days`, `screen_apps` |
| `bucket` | `bucket_items` |
| `projects` and their logs and photos | `projects`, `project_logs`, `project_log_photos` |
| `library` | `library_items` |
| `wishlist` | `wishlist_items` |
| `orders` | `clothing_orders` |
| `workouts` | `workouts` |
| `courses` | `courses` |
| `trades` | `trade_records` |
| `sessions` | `ai_sessions` |
| `chat` | `chat_messages` |

Photo ids in the old state point at IndexedDB records. The import has to upload each one before it links it.

## Willow reference facts

- Routes: `#home`, `#calendar`, `#history`, `#journal`, `#mood`, `#metime`, `#techlab`, `#analytics`, `#goals`, `#goal-<id>`, `#library`, `#savings`, `#screen`, `#settings`.
- Goal ids: `trading`, `ai`, `glow`, `tech`, `money`, `reading`, `cs`.
- Mood keys: `happy`, `peaceful`, `thinking`, `excited`, `neutral`, `sad`, `stressed`, `unproductive`, `tired`.
- Dates use Asia/Manila time. Currency is PHP (₱). The weekly savings target is ₱1,000.
- Visuals: Fredoka for titles and Outfit for body text. The scenic backgrounds are in `legacy/willow/img/`.

## Finance Trading brief

The Finance Trading brief (Parts 1–8) was given in chat on 2026-11-17. It is not saved in this repo. Paste it into the new chat.

## Running the Willow tests

Serve `legacy/willow` on port 8765 and run the scripts in `legacy/tests` with Node and Playwright, for example:

    python3 -m http.server 8765 --bind 127.0.0.1 --directory legacy/willow
    node legacy/tests/test-r19.js

The tests expect `http://127.0.0.1:8765/index.html`. Chromium is installed for Playwright in the original environment.
