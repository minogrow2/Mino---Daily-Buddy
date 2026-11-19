-- Daily loss percentages can be measured against the fixed account size or the start-of-day balance.
-- Existing accounts were always measured against account size, so they keep that basis.

alter table public.prop_accounts drop constraint if exists prop_accounts_daily_loss_basis_check;
update public.prop_accounts set daily_loss_basis = 'account_size';
alter table public.prop_accounts alter column daily_loss_basis set default 'account_size';
alter table public.prop_accounts add constraint prop_accounts_daily_loss_basis_check check (daily_loss_basis in ('account_size', 'balance'));
