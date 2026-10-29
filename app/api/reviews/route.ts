// POST /api/reviews — the "take this review" side of the contract.
// All logic lives here (the kitchen), never in the React code (the dining area).

import { insertReview, restaurantExists } from "@/db/store";
import { normalizeTopics } from "@/lib/topics";

export async function POST(request: Request) {
  // The backend never trusts the frontend: anyone can call this API directly,
  // so we re-check everything the star picker "already" limited.
  let body: { restaurantId?: unknown; rating?: unknown; comment?: unknown; topics?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  // Check 1: rating is a whole number from 1 to 5. Reject 500, 3.5, "5".
  const rating = body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
  }

  // Check 2: comment is a non-empty string after trimming whitespace.
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!comment) {
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  // Check 3: the restaurant actually exists (a real database lookup).
  // Await matters: restaurantExists talks to the database, so it returns a Promise.
  // Without await, every Promise is "truthy" and ANY restaurantId would pass.
  const restaurantId = body.restaurantId;
  if (typeof restaurantId !== "number" || !(await restaurantExists(restaurantId))) {
    return Response.json({ error: "That restaurant does not exist" }, { status: 400 });
  }

  // Check 4: topics are OPTIONAL facts. When present they must all be names we
  // know — they get stored as-is and count as "mentions", never as sentiment.
  const normalized = normalizeTopics(body.topics);
  if (!normalized.ok) {
    return Response.json({ error: normalized.error }, { status: 400 });
  }

  // All checks passed: write exactly ONE row of fact. Nothing else changes.
  const reviewId = await insertReview(restaurantId, rating, comment, normalized.topics);
  return Response.json({ success: true, reviewId }, { status: 201 });
}
