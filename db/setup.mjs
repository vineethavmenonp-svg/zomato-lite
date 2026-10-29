// One-time setup: apply schema.sql to the Neon database, then seed facts.
// Idempotent: a restaurant that already exists is not re-created, so running
// this twice won't duplicate anything. Seed rows are only added for a
// restaurant that has no reviews yet.
//
// Run with:  npm run db:setup

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("No DATABASE_URL in environment. Run with the .env.local file present.");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

// --- 1. Apply the schema (facts-shaped: no average_rating, no latest_review) ---
const raw = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
// Strip comment lines, then split into individual statements.
const schema = raw
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const statements = schema.split(";").map((s) => s.trim()).filter((s) => s.length > 0);

for (const statement of statements) {
  try {
    await sql.query(statement, []); // raw SQL, applied as-is
  } catch (err) {
    // Postgres codes: 42P07 table exists, 42P04 dup object, 42701 dup column — fine when re-running
    if (["42P07", "42P04", "42701"].includes(String(err.code))) continue;
    throw err;
  }
}
console.log("✓ schema applied");

// --- 1b. Idempotent column migrations (runs fine on tables that already exist) ---
await sql.query("ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image TEXT", []);
console.log("✓ image column present");
await sql.query(
  "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS topics JSONB NOT NULL DEFAULT '[]'::jsonb",
  []
);
console.log("✓ topics column present");

// --- 2. Seed Ludhiana Burrito (only if absent) ---
const existing = await sql`SELECT id FROM restaurants WHERE name = 'Ludhiana Burrito'`;
let restaurantId;
if (existing.length > 0) {
  restaurantId = existing[0].id;
  console.log(`✓ restaurant already exists (id ${restaurantId}), not re-creating`);
} else {
  const inserted = await sql`
    INSERT INTO restaurants (name, cuisine, area, image)
    VALUES ('Ludhiana Burrito', 'Indian', 'Sector 32', 'https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=800&q=80&auto=format&fit=crop')
    RETURNING id
  `;
  restaurantId = inserted[0].id;
  console.log(`✓ restaurant created (id ${restaurantId})`);
}

// --- 3. Seed fictional demo restaurants (only if absent, and with NO reviews:
//      inventing customer reviews would be dishonest data). Repeatable:
//      every run leaves the same rows behind. ---
const DEMOS = [
  { name: "Model Town Paneer House", cuisine: "Indian", area: "Model Town",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80&auto=format&fit=crop" },
  { name: "Sarabha Nagar Pav Bhaji", cuisine: "Street food", area: "Sarabha Nagar",
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80&auto=format&fit=crop" },
  { name: "Trattoria Ludhiana", cuisine: "Italian", area: "Civil Lines",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&auto=format&fit=crop" },
  { name: "Campus Wrap Co.", cuisine: "Wraps & Rolls", area: "PAU Gate",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80&auto=format&fit=crop" },
];
for (const demo of DEMOS) {
  const found = await sql`SELECT id FROM restaurants WHERE name = ${demo.name}`;
  if (found.length > 0) {
    console.log(`• demo already exists (id ${found[0].id}): ${demo.name}`);
    continue;
  }
  const ins = await sql`
    INSERT INTO restaurants (name, cuisine, area, image)
    VALUES (${demo.name}, ${demo.cuisine}, ${demo.area}, ${demo.image})
    RETURNING id
  `;
  console.log(`✓ demo restaurant created (id ${ins[0].id}): ${demo.name}`);
}
const total = await sql`SELECT COUNT(*)::int AS n FROM restaurants`;
console.log(`Restaurants total: ${total[0].n}`);

// --- 4. Sample reviews for the demo restaurants (only while a restaurant has
//      ZERO reviews — so re-running this script never duplicates anything, and
//      a restaurant that has started collecting real reviews is left alone). ---
// Sample topics mirror what a real keyword-free reviewer would pick, using the
// same keyword logic as lib/topics.ts (kept in sync by hand — this is a .mjs
// script, so it cannot import the TypeScript module).
const SAMPLE_REVIEWS = {
  "Model Town Paneer House": [
    [4, "Paneer was soft and the gravy was rich. Rotis arrived hot.", "5 days", ["Food"]],
    [5, "Best paneer butter masala in town. Full marks.", "9 days", ["Food"]],
    [3, "Tasty, but we waited too long even on a weekday.", "3 days", ["Food", "Service"]],
    [2, "Asked for spicy, got sweet. Service was polite, at least.", "1 day", ["Food", "Service"]],
  ],
  "Sarabha Nagar Pav Bhaji": [
    [5, "Pav was buttered perfectly and the bhaji was thick and punchy.", "2 days", ["Food"]],
    [4, "Solid, hearty plate. The extra tikki was a nice touch.", "6 days", ["Food"]],
    [3, "Fine for a quick bite. Nothing memorable.", "4 days", []],
    [1, "Found a hair in the serving. Not going back.", "12 days", []],
  ],
  "Trattoria Ludhiana": [
    [4, "Wood-fired crust had a good chew. toppings tasted fresh.", "7 days", ["Food"]],
    [5, "The margherita tasted like an actual corner of Naples.", "10 days", ["Food"]],
    [2, "Soggy centre, and the garlic bread came out burnt.", "2 days", ["Food"]],
    [4, "Friendly staff and quick coffee. Desserts could be lighter.", "1 day", ["Service", "Food"]],
  ],
  "Campus Wrap Co.": [
    [4, "Flaky paratha wrap with masala potatoes. Great after-class stop.", "5 days", ["Food"]],
    [5, "The mint chutney zing makes it — order double.", "8 days", ["Food"]],
    [3, "Generous filling but the roll fell apart halfway.", "2 days", ["Food"]],
    [4, "Quick at the counter and fairly priced. Would repeat.", "3 days", ["Service", "Value"]],
  ],
};

for (const [restaurantName, reviews] of Object.entries(SAMPLE_REVIEWS)) {
  const res = await sql`SELECT id FROM restaurants WHERE name = ${restaurantName}`;
  if (res.length === 0) {
    console.log(`• no such demo restaurant: ${restaurantName}, skipping`);
    continue;
  }
  const rid = res[0].id;
  const count = await sql`SELECT COUNT(*)::int AS n FROM reviews WHERE restaurant_id = ${rid}`;
  if (count[0].n > 0) {
    console.log(`• ${restaurantName} already has ${count[0].n} review(s), samples skipped`);
    continue;
  }
  for (const [rating, comment, when, topics] of reviews) {
    await sql`
      INSERT INTO reviews (restaurant_id, rating, comment, created_at, topics)
      VALUES (${rid}, ${rating}, ${comment}, NOW() - (${when}::text)::interval, ${JSON.stringify(topics)}::jsonb)
    `;
  }
  console.log(`✓ ${reviews.length} sample reviews for ${restaurantName} (id ${rid})`);
}

// --- 4b. Backfill topics on SAMPLE reviews inserted before topics existed ---
// (also saves another setup run when fresh samples above were pre-inserted with empty topics).
// Matches DEMO SAMPLE reviews by their exact comment text AND topics being empty —
// so a user-authored review (any comment, any topics choice) is never touched,
// and Ludhiana Burrito's real reviews stay exactly as they are.
let backfilled = 0;
for (const reviews of Object.values(SAMPLE_REVIEWS)) {
  for (const [, comment, , topics] of reviews) {
    if (topics.length === 0) continue;
    const res = await sql`
      UPDATE reviews
      SET topics = ${JSON.stringify(topics)}::jsonb
      WHERE comment = ${comment} AND topics = '[]'::jsonb
    `;
    backfilled += res.rowCount ?? 0;
  }
}
console.log(`✓ topics backfilled on ${backfilled} sample review(s) (0 = already up to date)`);

// --- 3. Seed three starter reviews, days apart, only if the restaurant is empty ---
const count = await sql`SELECT COUNT(*)::int AS n FROM reviews WHERE restaurant_id = ${restaurantId}`;
if (count[0].n > 0) {
  console.log(`✓ reviews already exist (${count[0].n}), not re-seeding`);
} else {
  await sql`
    INSERT INTO reviews (restaurant_id, rating, comment, created_at) VALUES
      (${restaurantId}, 5, 'Paneer burrito is unreal',  NOW() - INTERVAL '8 days'),
      (${restaurantId}, 4, 'Good, but slow service',    NOW() - INTERVAL '6 days'),
      (${restaurantId}, 4, 'Solid. Would repeat.',      NOW() - INTERVAL '2 days')
  `;
  console.log("✓ 3 starter reviews seeded (8, 6 and 2 days ago)");
}

const final = await sql`
  SELECT COUNT(*)::int AS total, AVG(rating)::numeric(3,1) AS average
  FROM reviews WHERE restaurant_id = ${restaurantId}
`;
console.log(`Result: id ${restaurantId} · ${final[0].total} reviews · computed average ${final[0].average}`);
