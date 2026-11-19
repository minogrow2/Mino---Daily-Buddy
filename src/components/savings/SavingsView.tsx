"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/willow-savings.css";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay, fmtMonth, todayYMD } from "@/lib/dates";
import { deleteSavingsEntry } from "@/lib/willow/savings-actions";
import {
  DEFAULT_SAVINGS_TARGET,
  loadSavings,
  loadSavingsTarget,
  php,
  savingsSummary,
  type SavingsEntry,
  type SavingsKind,
} from "@/lib/willow/savings";
import { SavingsDialog } from "./SavingsDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

type Loaded = { today: string; entries: SavingsEntry[]; target: number };

/** Weekly savings in PHP: this week's progress against the target, the totals, and every deposit and withdrawal recorded. */
export function SavingsView() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<{ kind: SavingsKind; entry: SavingsEntry | null } | null>(null);
  const { ask, dialog: confirm } = useConfirm();

  useEffect(() => {
    let live = true;
    const today = todayYMD();
    Promise.all([loadSavings(), loadSavingsTarget()])
      .then(([entries, target]) => {
        if (live) {
          setLoaded({ today, entries, target });
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  const reload = () => setTick((t) => t + 1);

  const s = useMemo(() => (loaded ? savingsSummary(loaded.entries, loaded.today, loaded.target) : null), [loaded]);

  async function remove(entry: SavingsEntry) {
    if (!(await ask("Delete this record? Your totals will update."))) return;
    try {
      await deleteSavingsEntry(entry.id);
      reload();
    } catch (e) {
      setErr(errorText(e));
    }
  }

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Weekly savings · PHP</div>
          <h1>Savings</h1>
        </div>
        <div className="row-inline">
          <button
            type="button"
            className="wbtn small soft"
            disabled={!loaded}
            onClick={() => setDialog({ kind: "deposit", entry: null })}
          >
            + Deposit
          </button>
          <button
            type="button"
            className="wbtn small ghost"
            disabled={!loaded}
            onClick={() => setDialog({ kind: "withdrawal", entry: null })}
          >
            − Withdrawal
          </button>
        </div>
      </div>

      <ErrorNote error={err} />
      {!loaded && !err && <p className="empty">Opening your savings…</p>}

      {loaded && s && (
        <>
          <section className="card sv-hero reveal">
            <div className="stats">
              <div className="stat">
                <div className="small muted">Saved this week</div>
                <div className="v num">{php(s.saved)}</div>
              </div>
              <div className="stat">
                <div className="small muted">Weekly target</div>
                <div className="v num">{php(s.target)}</div>
              </div>
              <div className="stat">
                <div className="small muted">Remaining</div>
                <div className="v num">{php(s.remaining)}</div>
              </div>
              <div className="stat">
                <div className="small muted">Total accumulated</div>
                <div className="v num">{php(s.balance)}</div>
              </div>
            </div>
            <div className="sv-hero-bar">
              <div className="sv-hero-row">
                <span className="small">This week’s progress</span>
                <strong className="num">{s.progress}%</strong>
              </div>
              <div
                className="bar butter"
                style={{ marginTop: 6 }}
                role="progressbar"
                aria-label="This week’s progress"
                aria-valuenow={s.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${s.progress}%` }} />
              </div>
              <p className="small muted sv-note">
                Weeks run Monday to Sunday, and each one starts at zero. Nothing carries over unless you record it. The weekly
                target is read from your saved settings, {php(DEFAULT_SAVINGS_TARGET)} by default.
              </p>
            </div>
          </section>

          <div className="grid two">
            <Card title="Weekly history" eyebrow="Last 8 weeks">
              <div className="table-scroll">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>Week of</th>
                      <th>Saved</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.weeks.map((w) => (
                      <tr key={w.ws}>
                        <td>{fmtDay(w.ws, { month: "short", day: "numeric" })}</td>
                        <td className="num">{php(w.saved)}</td>
                        <td className="num">{w.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Monthly summary" eyebrow="Recent months">
              <div className="table-scroll">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Deposits</th>
                      <th>Withdrawals</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.months.map((m) => (
                      <tr key={m.month}>
                        <td>{fmtMonth(m.month)}</td>
                        <td className="num">{php(m.dep)}</td>
                        <td className="num">{php(m.wd)}</td>
                        <td className="num">{php(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Savings history" eyebrow="Records">
            {loaded.entries.length ? (
              <ul className="list">
                {loaded.entries.map((e) => (
                  <li key={e.id} className="item wrap-row">
                    <span className="grow">
                      {fmtDay(e.day, { month: "short", day: "numeric", year: "numeric" })}
                      {e.note && <span className="small muted"> · {e.note}</span>}
                    </span>
                    <span className={`num sv-amount${e.kind === "deposit" ? "" : " muted"}`}>
                      {e.kind === "deposit" ? "+" : "−"}
                      {php(e.amount)}
                    </span>
                    <div className="item-actions">
                      <button type="button" className="wbtn soft small" onClick={() => setDialog({ kind: e.kind, entry: e })}>
                        Edit
                      </button>
                      <button type="button" className="wbtn danger small" onClick={() => remove(e)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No deposits yet. Record what you actually saved, and the weekly bar fills in.</div>
            )}
          </Card>
        </>
      )}

      {confirm}
      {dialog && loaded && (
        <SavingsDialog
          entry={dialog.entry}
          initialKind={dialog.kind}
          today={loaded.today}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
