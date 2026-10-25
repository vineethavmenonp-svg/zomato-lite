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
    // Postgres error 42P07/42P04 = "already exists" — fine when re-running.
    if (String(err?.code) === "42P07" || String(err?.code) === "42P04") continue;
    throw err;
  }
}
console.log("✓ schema applied");

// --- 2. Seed Ludhiana Burrito (only if absent) ---
const existing = await sql`SELECT id FROM restaurants WHERE name = 'Ludhiana Burrito'`;
let restaurantId;
if (existing.length > 0) {
  restaurantId = existing[0].id;
  console.log(`✓ restaurant already exists (id ${restaurantId}), not re-creating`);
} else {
  const inserted = await sql`
    INSERT INTO restaurants (name, cuisine, area)
    VALUES ('Ludhiana Burrito', 'Indian', 'Sector 32')
    RETURNING id
  `;
  restaurantId = inserted[0].id;
  console.log(`✓ restaurant created (id ${restaurantId})`);
}

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
