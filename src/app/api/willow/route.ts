// Willow’s replies. Only a signed-in person can ask; the reply uses the server’s Anthropic key, never the browser’s.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MINO_RULES } from "@/lib/willow/constants";

const MODEL = "claude-haiku-5-5";
const MAX_TURNS = 12;

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "failed" }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { messages?: unknown; context?: unknown } | null;
  const context = typeof body?.context === "string" ? body.context.slice(0, 6000) : "";
  const messages = Array.isArray(body?.messages)
    ? (body.messages as Turn[])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        .slice(-MAX_TURNS)
    : [];
  if (!messages.length || messages[0].role !== "user") return NextResponse.json({ error: "failed" }, { status: 400 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: `${MINO_RULES}\n\nContext about the person: ${context}`,
      messages,
    }),
  });
  if (res.status === 429) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!res.ok) return NextResponse.json({ error: "failed" }, { status: 502 });

  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!text) return NextResponse.json({ error: "failed" }, { status: 502 });
  return NextResponse.json({ text });
}
