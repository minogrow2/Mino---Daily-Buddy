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
- Done (2026-11-17): npm works (`npm view next version` -> 16.4.6). Next.js 16 app scaffolded at the repo root (TypeScript, Tailwind v4, App Router), Supabase clients (`src/lib/supabase/`), session proxy (`src/proxy.ts`, Next 16's name for middleware), email/password sign-in at `/login`, sign-out at `/auth/signout`, and a placeholder home that checks the database connection. Fonts (Fredoka, Outfit) are self-hosted from npm because Google Fonts is not reachable from some build sandboxes.
- Next 16 notes: `cacheComponents` is on, so no `export const dynamic`; read cookies/Supabase inside a `<Suspense>` boundary. See `AGENTS.md` and `node_modules/next/dist/docs/`.
- Not started: porting the Willow pages, the data import, Finance Trading.

## Owner steps (not doable from code)

1. Supabase dashboard -> Authentication -> Users -> **Add user** (your email + password, tick auto-confirm).
2. Authentication -> Sign In / Providers -> turn **Allow new users to sign up** off.
3. Vercel: import the repo, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`), deploy.
4. Supabase -> Authentication -> URL Configuration: set Site URL to the Vercel URL.
5. Delete the leftover `rls-test.jpg` storage record (see above).

## Next steps, in order

1. Build the app shell (sidebar / bottom nav) and port each Willow page. Compare with `legacy/willow/`, then run the matching checks from `legacy/tests/`.
2. Build a one-time import: read `mino.state.v2` from localStorage, upload IndexedDB photos to the `media` bucket, insert rows. Keep the local copy until verified.
3. Finance Trading makeover (brief below / in chat): new tables via new migration files, then pages under `/goals/finance-trading/...`.

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

## Finance Trading makeover, stage 2 (backtesting and live trading)

- Backtesting Logger: session library with a "Start from" option (blank, example session template with 13 headings, or a saved template). Templates live under the Templates tab.
- Backtesting Analytics: strategies (create, edit, archive, restore, delete with confirm), a flexible trade table with custom columns and CSV export, statistics rings, equity and P/L charts, and a monthly calendar. The compare tab shows per-strategy stats only, so trades are never mixed.
- Live Trading: off until "ACTIVATE LIVE TRADING" is confirmed. Prop firm accounts with risk rules (daily and overall loss as amount or %, static or trailing drawdown, floating P/L and fees options, reset timezone and time, warning levels, trade limit, profit target). Account page has Risk, Trades, Statistics and History tabs. Breaches are confirmed and logged. Calculators and the pre-trade checklist are under Live Trading → Calculators.
- Numbers from Postgres are normalized in the shared row hook (numeric columns arrive as strings).
- Daily loss percentages are measured against the account size by default, or against the start-of-day balance (chosen per account).
- Table columns can be resized by dragging the column edge, and custom columns can change type.
- Account setup is three steps (account, risk rules, reset and alerts).
- Editor fonts now include Nunito and Montserrat. Emotions list FOMO and Disciplined as separate choices.
- Old Willow local data is not imported (not needed, per the user).
- Browser end-to-end tests cannot run in the sandbox (it cannot reach supabase.co), so test on the Vercel preview.
