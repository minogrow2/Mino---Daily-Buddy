// Willow reference data: goals, habits, moods, Me Time items and the activity categories. Kept from the legacy app.

export type GoalKey = "trading" | "ai" | "glow" | "tech" | "money" | "reading" | "cs";

export const GOALS: { id: GoalKey; no: string; name: string; status: string; blurb: string }[] = [
  { id: "trading", no: "01", name: "Finance Trading", status: "Active · November–December", blurb: "Markets, charting, strategy, backtesting. Real-money trading stays locked until you decide." },
  { id: "ai", no: "02", name: "Learn AI", status: "Active · November", blurb: "Hermes, agents, automation, intelligent systems, AI in cybersecurity." },
  { id: "glow", no: "03", name: "Glow Up", status: "Daily habits", blurb: "A healthy, toned, confident self. Consistency, never extremes." },
  { id: "tech", no: "04", name: "Tech Development and Reverse Engineering", status: "Active exploration", blurb: "Websites, Linux, home labs, agents, authorized reverse engineering." },
  { id: "money", no: "05", name: "Internet Money", status: "Preparation phase", blurb: "AI-assisted clipping and content. Stays in preparation until you activate it." },
  { id: "reading", no: "06", name: "Watch and Read", status: "Flexible", blurb: "Meaningful videos, documentaries, books and articles over mindless scrolling." },
  { id: "cs", no: "07", name: "CS Student Advantage", status: "Monthly learning", blurb: "Online courses, programming practice, a portfolio you can be proud of." },
];

export const GOAL_TINT: Record<GoalKey, string> = {
  trading: "#E2BE5E", ai: "#8FB8D8", glow: "#F0A1AE", tech: "#9CC7A9", money: "#E8A97E", reading: "#B9A3D6", cs: "#A9C48F",
};

/** The activity category a goal's weekly tick is logged under. */
export const GOAL_CAT: Record<GoalKey, string> = {
  trading: "trading", ai: "ai", glow: "workout", tech: "programming", money: "personal", reading: "reading", cs: "cs",
};

export const goalById = (id: string) => GOALS.find((g) => g.id === id) ?? null;

/** Default daily habits, seeded once per account. grp is "core" or "glow". */
export const DEFAULT_HABITS: { id: string; title: string; grp: "core" | "glow" }[] = [
  { id: "vitc", title: "Take Vitamin C and glutathione", grp: "core" },
  { id: "workout", title: "Light workout", grp: "core" },
  { id: "water", title: "Drink 1.5L water", grp: "core" },
  { id: "learn-ai", title: "Learn AI", grp: "core" },
  { id: "learn-trading", title: "Learn Finance Trading", grp: "core" },
  { id: "sugar", title: "Be mindful of sugar", grp: "glow" },
  { id: "eating", title: "Balanced eating", grp: "glow" },
  { id: "selfcare", title: "Lymphatic drainage / self-care routine", grp: "glow" },
  { id: "skincare", title: "Skincare routine", grp: "glow" },
];

export const CATS: Record<string, { label: string; learn?: boolean; offline?: boolean }> = {
  ai: { label: "Learning AI", learn: true },
  trading: { label: "Trading education", learn: true },
  programming: { label: "Programming", learn: true },
  cs: { label: "Course study", learn: true },
  reading: { label: "Reading or watching" },
  workout: { label: "Workout" },
  journal: { label: "Journaling" },
  social: { label: "Socializing", offline: true },
  outdoors: { label: "Outdoors and exploring", offline: true },
  personal: { label: "Personal time", offline: true },
  rest: { label: "Rest", offline: true },
};

/** Thin line icons (SVG inner markup), so they take the text colour. */
export const ICONS = {
  sudoku: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
  gaming: '<path d="M7 9h10a4 4 0 0 1 3.8 5.2l-.8 2.5a2 2 0 0 1-3.4.6L14.9 15H9.1l-1.7 2.3a2 2 0 0 1-3.4-.6l-.8-2.5A4 4 0 0 1 7 9z"/><path d="M8 11.5v2M7 12.5h2M15.5 11.8h.01M17.5 13.8h.01"/>',
  reading: '<path d="M4 5.5h5.5a2.5 2.5 0 0 1 2.5 2.5V19a2 2 0 0 0-2-2H4z"/><path d="M20 5.5h-5.5A2.5 2.5 0 0 0 12 8V19a2 2 0 0 1 2-2h6z"/>',
  movie: '<rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M3.5 10h17M8 6l2 4M13 6l2 4"/>',
  outing: '<path d="M4 20h16M6 20V9l6-4.5L18 9v11M10 20v-5h4v5"/>',
  walk: '<ellipse cx="9" cy="8.5" rx="2" ry="3"/><ellipse cx="15" cy="15.5" rx="2" ry="3"/>',
  happy: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  peaceful: '<circle cx="12" cy="12" r="9"/><path d="M8 10.5q1.2 1.2 2.4 0M13.6 10.5q1.2 1.2 2.4 0"/><path d="M9.5 14.5a3.5 3.5 0 0 0 5 0"/>',
  thinking: '<path d="M7 18h10.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 18z"/>',
  excited: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  neutral: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  sad: '<circle cx="12" cy="12" r="9"/><path d="M8.5 16a4 4 0 0 1 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  stressed: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5l1.2-1 1.3 1 1.3-1 1.3 1 1.2-1"/><path d="M8.5 9.5h1.5M14 9.5h1.5"/>',
  unproductive: '<rect x="3" y="7.5" width="16" height="9" rx="2.5"/><path d="M19.5 10.5v3M6.5 10.5v3"/>',
  tired: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  pin: '<path d="M9 3.5h6l-1 5.5 3 3.2H7l3-3.2-1-5.5z"/><path d="M12 12.2V21"/>',
} as const;

export const MOODS: { key: string; label: string; icon: string }[] = [
  { key: "happy", label: "Happy", icon: ICONS.happy },
  { key: "peaceful", label: "Peaceful", icon: ICONS.peaceful },
  { key: "thinking", label: "Thinking a lot", icon: ICONS.thinking },
  { key: "excited", label: "Excited", icon: ICONS.excited },
  { key: "neutral", label: "Neutral", icon: ICONS.neutral },
  { key: "sad", label: "Sad", icon: ICONS.sad },
  { key: "stressed", label: "Stressed", icon: ICONS.stressed },
  { key: "unproductive", label: "Unproductive", icon: ICONS.unproductive },
  { key: "tired", label: "Tired", icon: ICONS.tired },
];
export const moodOf = (key: string | null | undefined) => MOODS.find((m) => m.key === key) ?? null;

export const MOOD_NOTES: Record<string, string> = {
  sad: "It’s okay to feel low. Be kind to yourself today.",
  stressed: "Take it slowly. Breathing out longer than you breathe in can help.",
  tired: "Rest counts. Maybe a short nap or an early night.",
};

/** Me Time checklist. Each tick is an offline activity, so it shows on the Me Time page and in the day’s record. */
export const ME_TIME: { key: string; label: string; category: string; icon: string }[] = [
  { key: "sudoku", label: "Sudoku", category: "personal", icon: ICONS.sudoku },
  { key: "gaming", label: "Gaming", category: "personal", icon: ICONS.gaming },
  { key: "reading", label: "Reading", category: "personal", icon: ICONS.reading },
  { key: "movie", label: "Movie", category: "rest", icon: ICONS.movie },
  { key: "outing", label: "Go out", category: "outdoors", icon: ICONS.outing },
  { key: "walk", label: "Walk", category: "outdoors", icon: ICONS.walk },
];

export const MOTTOS = [
  "Small steps still count.", "Progress, not perfection.", "Be curious today.", "Rest is part of the plan.",
  "Go outside for a little while.", "You are allowed to enjoy this.", "One good hour is a good hour.",
];

export const MINO_RULES =
  "You are Willow, a warm, non-judgmental daily companion inside a personal life journal. Never make the person feel their worth depends on productivity. Keep replies short (2–4 sentences). Encourage time offline and real-world experiences. Do not give medical, dieting, or financial advice; for trading, stay educational and never encourage real-money trading. Use only the context you are given; do not invent facts about the person.";
