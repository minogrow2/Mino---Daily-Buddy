// Backtesting session template: the headings every logged session should cover.
export const EXAMPLE_SESSION_HEADINGS = [
  "Strategy Name",
  "Objective",
  "Market Conditions",
  "Trading Session",
  "Entry Conditions",
  "Exit Conditions",
  "Stop Loss and Take Profit",
  "Risk-to-Reward Ratio",
  "Results",
  "Observations",
  "Mistakes",
  "Lessons Learned",
  "Screenshots",
];

/** Editor content for the example session template: one heading per section, each with an empty line to write in. */
export function exampleSessionContent() {
  return {
    type: "doc",
    content: EXAMPLE_SESSION_HEADINGS.flatMap((text) => [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] },
      { type: "paragraph" },
    ]),
  };
}
