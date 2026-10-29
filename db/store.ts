// The real data layer: raw SQL against Neon Postgres via @neondatabase/serverless.
// No ORM. No query builder. The SQL is right here, exactly as the lesson shows:
//   store FACTS only — never store a computed average.
//   compute ANSWERS at request time — AVG, COUNT, latest.
// We use the driver's Pool (WebSocket mode): it speaks real Postgres wire
// protocol, which the HTTP-query helper does not survive Next.js bundling.

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type Restaurant = {
  id: number;
  name: string;
  cuisine: string;
  area: string;
  image: string | null;
};
export type Review = {
  id: number;
  restaurantId: number;
  rating: number;
  comment: string;
  // Optional topic tags the reviewer attached: a subset of TOPICS from lib/topics.
  topics: string[];
  createdAt: string;
};

export async function restaurantExists(id: number): Promise<boolean> {
  const res = await pool.query("SELECT 1 FROM restaurants WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getRestaurant(id: number): Promise<Restaurant | null> {
  const res = await pool.query(
    "SELECT id, name, cuisine, area, image FROM restaurants WHERE id = $1",
    [id]
  );
  return (res.rows[0] as Restaurant) ?? null;
}

// For the homepage: every restaurant with its OWN computed average and count.
// One grouped query still computes them separately per restaurant — facts in,
// answers out, nothing stored back.
export async function getRestaurantsOverview() {
  const res = await pool.query(`
    SELECT r.id, r.name, r.cuisine, r.area, r.image,
           COUNT(rv.id)::int                                              AS total_reviews,
           ROUND(AVG(rv.rating)::numeric, 1)                              AS average_rating
    FROM restaurants r
    LEFT JOIN reviews rv ON rv.restaurant_id = r.id
    GROUP BY r.id, r.name, r.cuisine, r.area, r.image
    ORDER BY r.id
  `);
  return res.rows.map((row: { id: number; name: string; cuisine: string; area: string; image: string | null; total_reviews: number; average_rating: string | null }) => ({
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    area: row.area,
    image: row.image,
    averageRating: row.average_rating === null ? null : Number(row.average_rating),
    totalReviews: row.total_reviews,
  }));
}

export async function insertReview(
  restaurantId: number,
  rating: number,
  comment: string,
  topics: string[] = []
): Promise<number> {
  const res = await pool.query<{ id: number }>(
    // topics is a JSONB list of fact tags ("this review talks about Food"),
    "INSERT INTO reviews (restaurant_id, rating, comment, topics) VALUES ($1, $2, $3, $4::jsonb) RETURNING id",
    [restaurantId, rating, comment, JSON.stringify(topics)]
  );
  return res.rows[0].id;
}

// The three lines that are the entire intelligence of this product:
//   1. AVG(rating)              -> how good, right now
//   2. COUNT(*)                 -> how much evidence
//   3. ORDER BY created_at DESC -> recency, because it is what people trust
// Nothing is ever stored back.
export async function getRestaurantPage(id: number, topic: string | null = null) {
  const restaurant = await getRestaurant(id);
  if (!restaurant) return null;

  // Newer first, so index 0 is by definition the latest review.
  const res = await pool.query<{
    id: number;
    restaurant_id: number;
    rating: number;
    comment: string;
    topics: unknown;
    created_at: Date;
  }>(
    "SELECT id, restaurant_id, rating, comment, topics, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC",
    [id]
  );

  const allReviews: Review[] = res.rows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurant_id,
    rating: r.rating,
    comment: r.comment,
    topics: Array.isArray(r.topics) ? r.topics.filter((t): t is string => typeof t === "string") : [],
    createdAt: new Date(r.created_at).toISOString(),
  }));

  // Decision, stated out loud: with zero reviews, an average of nothing is NOT a number.
  // "What happens when there is nothing yet" is a product question — we show an empty state.
  // Averages are ALWAYS over all reviews — a topic filter narrows the list below,
  // never the restaurant's overall rating.
  const totalReviews = allReviews.length;
  const averageRating =
    totalReviews === 0
      ? null
      : Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10;

  // Topic mention counts, computed at request time (never stored).
  // These count reviews that MENTION a topic — they do not measure whether
  // reviewers liked it: a 1-star "Found a hair" review can be a Service mention.
  const topicCounts = { Food: 0, Service: 0, Ambience: 0, Value: 0, Others: 0 };
  for (const review of allReviews) {
    for (const t of review.topics) {
      if (t in topicCounts) topicCounts[t as keyof typeof topicCounts] += 1;
    }
  }

  // How many of this restaurant's reviews carry no category tags at all —
  // used for the "Some reviews don't have categories yet." note.
  const reviewsWithoutCategories = allReviews.filter((r) => r.topics.length === 0).length;

  // When a topic filter is active, only matching reviews go in the list.
  const listed = topic ? allReviews.filter((r) => r.topics.includes(topic)) : allReviews;

  const [latestReview, ...olderReviews] = listed;

  return {
    id: restaurant.id, // so "Write a Review" opens THIS restaurant, not a hardcoded one
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    area: restaurant.area,
    image: restaurant.image,
    averageRating,
    totalReviews, // always all reviews, filter or not
    reviewsWithoutCategories,
    topicCounts,
    // All mode: latest + earlier split, as before. Topic filter: one list of
    // every review that mentions the topic (its latest is just first in line).
    latestReview: topic ? null : (latestReview ?? null),
    reviews: topic ? listed : olderReviews,
  };
}
