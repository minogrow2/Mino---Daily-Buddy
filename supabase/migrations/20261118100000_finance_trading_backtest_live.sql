-- Finance Trading makeover, stage 2: backtesting templates, strategies and backtest trades,
-- live trading (activation, prop firm accounts, live trades, risk events). Every table is per-user with RLS.

alter table public.trading_documents drop constraint trading_documents_kind_check;
alter table public.trading_documents add constraint trading_documents_kind_check
  check (kind in ('concept', 'backtest', 'template'));

create table public.strategies (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default '' check (char_length(category) <= 80),
  status text not null default 'active' check (status in ('active', 'archived')),
  currency text not null default 'PHP' check (char_length(currency) = 3),
  starting_balance numeric(14,2) not null default 0 check (starting_balance >= 0),
  target_pl numeric(14,2) check (target_pl is null or target_pl > 0),
  columns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, id)
);

create table public.backtest_trades (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  strategy_id uuid not null,
  trade_date date not null,
  position integer not null default 0 check (position >= 0),
  market text not null default '' check (char_length(market) <= 40),
  session text not null default '' check (char_length(session) <= 40),
  direction text not null default '' check (direction in ('', 'Buy', 'Sell')),
  lot_size numeric(12,4) check (lot_size is null or lot_size >= 0),
  rr numeric(10,3) check (rr is null or rr >= 0),
  result text not null default '' check (result in ('', 'Win', 'Loss', 'Breakeven')),
  pl numeric(14,2) not null default 0,
  emotion text not null default '' check (char_length(emotion) <= 40),
  explanation text not null default '' check (char_length(explanation) <= 20000),
  screenshot_id text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id, strategy_id) references public.strategies (user_id, id) on delete cascade,
  foreign key (user_id, screenshot_id) references public.media (user_id, id) on delete set null (screenshot_id)
);
create index backtest_trades_strategy_idx on public.backtest_trades (user_id, strategy_id, trade_date);

create table public.live_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activated boolean not null default false,
  activated_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table public.prop_accounts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  firm_name text not null check (char_length(firm_name) between 1 and 120),
  account_label text not null default '' check (char_length(account_label) <= 120),
  currency text not null default 'USD' check (char_length(currency) = 3),
  account_size numeric(14,2) not null check (account_size > 0),
  starting_balance numeric(14,2) not null check (starting_balance >= 0),
  max_daily_loss numeric(14,2) check (max_daily_loss is null or max_daily_loss > 0),
  max_daily_loss_pct numeric(6,2) check (max_daily_loss_pct is null or (max_daily_loss_pct > 0 and max_daily_loss_pct <= 100)),
  max_overall_loss numeric(14,2) check (max_overall_loss is null or max_overall_loss > 0),
  max_overall_loss_pct numeric(6,2) check (max_overall_loss_pct is null or (max_overall_loss_pct > 0 and max_overall_loss_pct <= 100)),
  drawdown_type text not null default 'static' check (drawdown_type in ('static', 'trailing')),
  daily_loss_basis text not null default 'balance' check (daily_loss_basis in ('balance', 'equity')),
  include_floating boolean not null default false,
  include_fees boolean not null default false,
  profit_target numeric(14,2) check (profit_target is null or profit_target > 0),
  max_trades_per_day integer check (max_trades_per_day is null or max_trades_per_day > 0),
  reset_timezone text not null default 'Asia/Manila' check (char_length(reset_timezone) <= 64),
  reset_time text not null default '00:00' check (reset_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  warn_low smallint not null default 70 check (warn_low between 1 and 99),
  warn_high smallint not null default 85 check (warn_high between 1 and 100 and warn_high >= warn_low),
  unrealized_pl numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'passed', 'breached', 'archived')),
  columns jsonb not null default '[]'::jsonb,
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, id)
);

create table public.live_trades (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  trade_date date not null,
  position integer not null default 0 check (position >= 0),
  market text not null default '' check (char_length(market) <= 40),
  session text not null default '' check (char_length(session) <= 40),
  direction text not null default '' check (direction in ('', 'Buy', 'Sell')),
  lot_size numeric(12,4) check (lot_size is null or lot_size >= 0),
  stop_loss numeric(14,5) check (stop_loss is null or stop_loss > 0),
  take_profit numeric(14,5) check (take_profit is null or take_profit > 0),
  rr numeric(10,3) check (rr is null or rr >= 0),
  result text not null default '' check (result in ('', 'Win', 'Loss', 'Breakeven')),
  pl numeric(14,2) not null default 0,
  fee numeric(12,2) not null default 0 check (fee >= 0),
  emotion text not null default '' check (char_length(emotion) <= 40),
  explanation text not null default '' check (char_length(explanation) <= 20000),
  screenshot_id text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id, account_id) references public.prop_accounts (user_id, id) on delete cascade,
  foreign key (user_id, screenshot_id) references public.media (user_id, id) on delete set null (screenshot_id)
);
create index live_trades_account_idx on public.live_trades (user_id, account_id, trade_date);

create table public.risk_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  kind text not null check (kind in ('breach_confirmed', 'status_change', 'note')),
  trading_day date,
  detail text not null default '' check (char_length(detail) <= 2000),
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id, account_id) references public.prop_accounts (user_id, id) on delete cascade
);

create trigger strategies_touch before update on public.strategies for each row execute function public.touch_updated_at();
create trigger backtest_trades_touch before update on public.backtest_trades for each row execute function public.touch_updated_at();
create trigger live_settings_touch before update on public.live_settings for each row execute function public.touch_updated_at();
create trigger prop_accounts_touch before update on public.prop_accounts for each row execute function public.touch_updated_at();
create trigger live_trades_touch before update on public.live_trades for each row execute function public.touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['strategies', 'backtest_trades', 'live_settings', 'prop_accounts', 'live_trades', 'risk_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  end loop;
end $$;
