/** Journal helpers shared by the Journal page and the calendar day page. */

export const JOURNAL_TYPES: [string, string][] = [
  ["daily", "Daily diary"],
  ["random", "Random thoughts"],
  ["opinion", "Personal opinions"],
  ["realization", "Life realizations"],
  ["gratitude", "Gratitude"],
  ["experience", "Things I experienced"],
  ["remember", "Things I want to remember"],
  ["future", "Future plans"],
];

export const typeLabel = (key: string) => JOURNAL_TYPES.find(([k]) => k === key)?.[1] ?? "Entry";

/** Scrapbook pages take these tones in turn, as in the legacy app. */
export const SCRAP_TONES = ["pink", "butter", "sage"] as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Entries written before the rich editor are plain text; this turns each line into a paragraph the editor can show. */
export function htmlFromBody(body: string): string {
  return body
    .split(/\n+/)
    .filter((line) => line.trim() !== "")
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}
