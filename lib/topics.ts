// The review categories. Topics are OPTIONAL tags a reviewer can attach to a
// review. Nothing about "how good" is stored in them — Food mention ≠ positive
// review — counts are computed at request time and labelled as mentions.
//
// "Others" is selectable but has no keyword rules: the FORM suggests it as the
// fallback when a non-empty comment matches none of the four content categories
// (the reviewer can swap it for a more suitable category or remove it), or the
// reviewer can pick it manually. It saves like any other category and is
// counted on the restaurant page.
//
// Used in:
//   db/store.ts        -> stores/verifies topics + counts mentions per category
//   POST /api/reviews  -> backend validation (the only place that can reject)
//   restaurant page    -> mention-count chips + filters (incl. Others)
//   form page          -> keyword suggestions + toggleable chips

export const TOPICS = ["Food", "Service", "Ambience", "Value", "Others"] as const;
export type Topic = (typeof TOPICS)[number];

// Keyword-suggested categories: the four content ones. Others is never
// keyword-suggested — it exists only as the no-match fallback / manual choice.
export const KEYWORD_TOPICS = ["Food", "Service", "Ambience", "Value"] as const;

// Keywords that hint a topic from free text. Deliberately broad food words:
// this feeds a SUGGESTION whose checkbox the reviewer can edit or ignore.
export const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  Food: [
    "food", "paneer", "pav", "bhaji", "tikki", "pizza", "margherita", "crust",
    "wrap", "roll", "paratha", "gravy", "dessert", "coffee", "chutney",
    "filling", "toppings", "masala", "roti", "bread", "garlic", "spicy",
    "soggy", "burnt", "tasty", "delicious", "tasted", "flavour", "flavor",
    "sauce", "crunchy", "juicy", "tender", "bite", "chicken", "taste",
    "bland", "undercooked",
  ],
  Service: [
    "service", "staff", "waiter", "wait", "waiting", "slow", "polite",
    "friendly", "counter", "rude", "hospitable",
  ],
  Ambience: [
    "ambience", "decor", "music", "noisy", "noise", "loud", "seating", "vibe",
    "interior", "atmosphere", "crowded", "lighting", "cosy", "cozy",
    "comfortable", "peaceful", "spacious",
  ],
  Value: [
    "price", "priced", "pricey", "cheap", "expensive", "value", "worth",
    "money", "costly", "overpriced", "affordable", "reasonable",
  ],
  Others: [],
};

// Multi-word phrases people actually write. A phrase counts as a rule of its
// own, so shorter single words can stay strict (e.g. "quick" alone is too
// ambiguous, but "quick service" is clear).
export const TOPIC_PHRASES: Record<Topic, string[]> = {
  Food: ["must try", "tasted great", "food was"],
  Service: [
    "long wait", "long waits", "long queue", "friendly staff", "helpful staff",
    "quick service", "slow service", "great service", "poor service",
    "waited ages",
  ],
  Ambience: [
    "cosy place", "cozy place", "cosy spot", "cozy spot", "nice vibe",
    "chill vibe", "great ambience", "cozy atmosphere", "cosy atmosphere",
  ],
  Value: [
    "value for money", "worth the price", "worth every penny", "good value",
    "bit expensive", "not worth", "worth the money",
  ],
  Others: [],
};

// Word-start anchored match: \bwait hits "waited"/"waiter", and \bpav does not
// hit "shampoo"-style accidents. Escaped so punctuation in phrases is inert.
function matchesWord(text: string, rule: string): boolean {
  const escaped = rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`, "i").test(text);
}

// Topics found in a piece of text (single words + common phrases).
// Always a subset of the four keyword categories — never Others.
export function suggestTopics(text: string): Topic[] {
  return KEYWORD_TOPICS.filter((topic) =>
    [...TOPIC_KEYWORDS[topic], ...TOPIC_PHRASES[topic]].some((rule) => matchesWord(text, rule))
  );
}

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

// Backend validation helper: topics are optional, but if present the value must
// be a list whose entries are exactly the known topic names. Dedupes.
export function normalizeTopics(
  input: unknown
): { ok: true; topics: Topic[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, topics: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "Topics must be a list like [\"Food\", \"Service\"]" };
  }
  const topics: Topic[] = [];
  for (const item of input) {
    if (!isTopic(item)) {
      return { ok: false, error: `Unknown topic. Choose from ${TOPICS.join(", ")}` };
    }
    if (!topics.includes(item)) topics.push(item);
  }
  return { ok: true, topics };
}
