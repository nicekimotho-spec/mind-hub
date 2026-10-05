/**
 * Worksheet content lives in code rather than the database so every wording change goes
 * through review like any other change.
 *
 * DRAFT CONTENT — like the intake safety screen (intake.ts) and PRD FR-SAF-05, these
 * are widely used self-help exercises written as placeholders, and must be reviewed and
 * signed off by a qualified clinician before real clients rely on them.
 */
export interface WorksheetTextPrompt {
  id: string;
  kind: "text";
  label: string;
  hint?: string;
}

/** A 0–10 rating, labelled at both ends. */
export interface WorksheetScalePrompt {
  id: string;
  kind: "scale";
  label: string;
  minLabel: string;
  maxLabel: string;
}

export type WorksheetPrompt = WorksheetTextPrompt | WorksheetScalePrompt;

export interface WorksheetDefinition {
  slug: string;
  title: string;
  summary: string;
  category: string;
  minutes: number;
  intro: string;
  prompts: WorksheetPrompt[];
}

export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

export const WORKSHEETS = [
  {
    slug: "thought-record",
    title: "Thought record",
    summary: "Slow down an upsetting thought and look at it from a few angles.",
    category: "Anxiety and low mood",
    minutes: 15,
    intro:
      "When something upsets us, the thoughts that pop up can feel like facts. Writing them down and looking at them from a few angles can take some of the sting out. There are no right answers.",
    prompts: [
      { id: "situation", kind: "text", label: "What happened?", hint: "Where were you, who was there, what was going on?" },
      { id: "thought", kind: "text", label: "What went through your mind?" },
      { id: "feeling", kind: "text", label: "What did you feel?", hint: "For example: anxious, sad, angry, ashamed." },
      { id: "intensityBefore", kind: "scale", label: "How strong was that feeling?", minLabel: "Barely there", maxLabel: "Overwhelming" },
      { id: "evidenceFor", kind: "text", label: "What makes the thought seem true?" },
      { id: "evidenceAgainst", kind: "text", label: "What doesn't quite fit the thought?" },
      {
        id: "balanced",
        kind: "text",
        label: "What's a more balanced way to see it?",
        hint: "What might you say to a friend who was in the same situation?",
      },
      { id: "intensityAfter", kind: "scale", label: "How strong is the feeling now?", minLabel: "Barely there", maxLabel: "Overwhelming" },
    ],
  },
  {
    slug: "grounding-5-4-3-2-1",
    title: "5-4-3-2-1 grounding",
    summary: "Use your senses to come back to the present when your mind is racing.",
    category: "Stress and overwhelm",
    minutes: 5,
    intro: "When your mind is racing, your senses can bring you back to the present moment. Go slowly. Short answers are fine.",
    prompts: [
      { id: "see", kind: "text", label: "Five things you can see" },
      { id: "touch", kind: "text", label: "Four things you can feel or touch" },
      { id: "hear", kind: "text", label: "Three things you can hear" },
      { id: "smell", kind: "text", label: "Two things you can smell" },
      { id: "taste", kind: "text", label: "One thing you can taste" },
      { id: "calmAfter", kind: "scale", label: "How settled do you feel now?", minLabel: "Not at all", maxLabel: "Completely" },
    ],
  },
  {
    slug: "three-good-things",
    title: "Three good things",
    summary: "Notice what went well today, however small.",
    category: "Mood and wellbeing",
    minutes: 5,
    intro:
      "Noticing what went well, even small things, can gently shift where your attention goes. It works best at the end of the day.",
    prompts: [
      { id: "first", kind: "text", label: "Something that went well today", hint: "And why do you think it happened?" },
      { id: "second", kind: "text", label: "Another good thing", hint: "It can be very small: a kind word, a good cup of tea." },
      { id: "third", kind: "text", label: "One more" },
    ],
  },
  {
    slug: "what-matters-to-me",
    title: "What matters to me",
    summary: "Name your values, and one small step towards them this week.",
    category: "Direction and purpose",
    minutes: 15,
    intro:
      "Values are the things that matter most to you. They aren't goals to finish, but directions to keep moving in. Knowing them can make hard choices a little clearer.",
    prompts: [
      {
        id: "areas",
        kind: "text",
        label: "Which parts of life matter most to you right now?",
        hint: "For example: family, faith, work, health, friendships, learning, community.",
      },
      { id: "why", kind: "text", label: "Why do these matter to you?" },
      { id: "livingBy", kind: "scale", label: "How closely are you living by them at the moment?", minLabel: "Not at all", maxLabel: "Fully" },
      { id: "step", kind: "text", label: "One small step this week that would move you in that direction" },
    ],
  },
  {
    slug: "sleep-diary",
    title: "Sleep diary",
    summary: "Track one night's sleep to spot what helps and what gets in the way.",
    category: "Sleep",
    minutes: 5,
    intro: "Filling this in each morning for a week or two can reveal patterns that are hard to notice otherwise.",
    prompts: [
      { id: "bedtime", kind: "text", label: "When did you go to bed, and roughly when did you fall asleep?" },
      { id: "waking", kind: "text", label: "Did you wake in the night? For how long?" },
      { id: "wakeTime", kind: "text", label: "When did you get up?" },
      { id: "rested", kind: "scale", label: "How rested do you feel?", minLabel: "Exhausted", maxLabel: "Fully rested" },
      {
        id: "factors",
        kind: "text",
        label: "Anything that helped or got in the way?",
        hint: "For example: caffeine, screens, worries, noise, exercise, a late meal.",
      },
    ],
  },
  {
    slug: "before-my-session",
    title: "Before my next session",
    summary: "A few minutes of reflection to make the most of your time together.",
    category: "Getting the most from therapy",
    minutes: 10,
    intro: "A little reflection before a session can help you use your time together well. Share it with your therapist if you'd like them to see it first.",
    prompts: [
      { id: "week", kind: "text", label: "How has your week been?" },
      { id: "mood", kind: "scale", label: "Overall, how have you been feeling?", minLabel: "Very low", maxLabel: "Very good" },
      { id: "topic", kind: "text", label: "What would you most like to talk about?" },
      { id: "noticed", kind: "text", label: "Anything you've noticed or tried since last time?" },
    ],
  },
] as const satisfies readonly WorksheetDefinition[];

export type WorksheetSlug = (typeof WORKSHEETS)[number]["slug"];
export const WORKSHEET_SLUGS = WORKSHEETS.map((w) => w.slug) as [WorksheetSlug, ...WorksheetSlug[]];

export function getWorksheet(slug: string): WorksheetDefinition | undefined {
  return WORKSHEETS.find((w) => w.slug === slug);
}

export type WorksheetAnswers = Record<string, string | number>;

/**
 * Checks answers against the worksheet's prompts: every key must be one of its prompt
 * ids, text prompts take text, scale prompts take a whole number from SCALE_MIN to
 * SCALE_MAX. Partial answers are fine — a worksheet can be saved halfway through.
 * Returns an error message, or null when the answers are valid.
 */
export function validateWorksheetAnswers(slug: string, answers: WorksheetAnswers): string | null {
  const worksheet = getWorksheet(slug);
  if (!worksheet) return "Unknown worksheet";
  const prompts = new Map(worksheet.prompts.map((p) => [p.id, p]));
  for (const [id, value] of Object.entries(answers)) {
    const prompt = prompts.get(id);
    if (!prompt) return `Unknown question: ${id}`;
    if (prompt.kind === "scale") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < SCALE_MIN || value > SCALE_MAX) {
        return `"${prompt.label}" needs a number from ${SCALE_MIN} to ${SCALE_MAX}`;
      }
    } else if (typeof value !== "string") {
      return `"${prompt.label}" needs a written answer`;
    }
  }
  return null;
}
