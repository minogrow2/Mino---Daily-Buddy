"use client";

import { useState } from "react";
import { ScreenDialog } from "@/components/screen/ScreenDialog";
import { Card } from "@/components/ui/Card";
import { addDays, fmtDay } from "@/lib/dates";
import { hm } from "@/lib/willow/logic";

/** Screen time on the Mood page: the picked day's total with an edit button, and the last seven days to log or edit from. */
export function ScreenTimeEditor({ day, today, screen, onSaved }: { day: string; today: string; screen: Record<string, number>; onSaved: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const total = screen[day];
  return (
    <Card
      eyebrow="Screen time"
      title={fmtDay(day)}
      right={
        <button type="button" className="wbtn soft small" onClick={() => setEditing(day)}>
          {total != null ? "Edit day" : "Log day"}
        </button>
      }
    >
      <p className="small muted">{total != null ? `${hm(total)} logged` : "Not logged yet"}</p>
      <ul className="list" style={{ marginTop: 10 }}>
        {days.map((d) => (
          <li key={d} className="item">
            <span className="grow">{fmtDay(d)}</span>
            <span className="small muted">{screen[d] != null ? hm(screen[d]) : "Not logged"}</span>
            <button type="button" className="wbtn ghost small" onClick={() => setEditing(d)}>
              {screen[d] != null ? "Edit" : "Log"}
            </button>
          </li>
        ))}
      </ul>
      {editing && <ScreenDialog day={editing} onSaved={onSaved} onClose={() => setEditing(null)} />}
    </Card>
  );
}
