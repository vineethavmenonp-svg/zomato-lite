// The real data layer: raw SQL against Neon Postgres via @neondatabase/serverless.
// No ORM. No query builder. The SQL is right here, exactly as the lesson shows:
//   store FACTS only — never store a computed average.
//   compute ANSWERS at request time — AVG, COUNT, latest.
// We use the driver's Pool (WebSocket mode): it speaks real Postgres wire
// protocol, which the HTTP-query helper does not survive Next.js bundling.

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type Restaurant = { id: number; name: string; cuisine: string; area: string };
export type Review = {
  id: number;
  restaurantId: number;
  rating: number;
  comment: string;
  createdAt: string;
};

export async function restaurantExists(id: number): Promise<boolean> {
  const res = await pool.query("SELECT 1 FROM restaurants WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getRestaurant(id: number): Promise<Restaurant | null> {
  const res = await pool.query(
    "SELECT id, name, cuisine, area FROM restaurants WHERE id = $1",
    [id]
  );
  return (res.rows[0] as Restaurant) ?? null;
}

export async function insertReview(
  restaurantId: number,
  rating: number,
  comment: string
): Promise<number> {
  const res = await pool.query<{ id: number }>(
    "INSERT INTO reviews (restaurant_id, rating, comment) VALUES ($1, $2, $3) RETURNING id",
    [restaurantId, rating, comment]
  );
  return res.rows[0].id;
}

// The three lines that are the entire intelligence of this product:
//   1. AVG(rating)              -> how good, right now
//   2. COUNT(*)                 -> how much evidence
//   3. ORDER BY created_at DESC -> recency, because it is what people trust
// Nothing is ever stored back.
export async function getRestaurantPage(id: number) {
  const restaurant = await getRestaurant(id);
  if (!restaurant) return null;

  // Newer first, so index 0 is by definition the latest review.
  const res = await pool.query<{
    id: number;
    restaurant_id: number;
    rating: number;
    comment: string;
    created_at: Date;
  }>(
    "SELECT id, restaurant_id, rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC",
    [id]
  );

  const reviews: Review[] = res.rows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurant_id,
    rating: r.rating,
    comment: r.comment,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  // Decision, stated out loud: with zero reviews, an average of nothing is NOT a number.
  // "What happens when there is nothing yet" is a product question — we show an empty state.
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews === 0
      ? null
      : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10;

  const [latestReview, ...olderReviews] = reviews;

  return {
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    area: restaurant.area,
    averageRating,
    totalReviews,
    latestReview: latestReview ?? null,
    reviews: olderReviews,
  };
}
