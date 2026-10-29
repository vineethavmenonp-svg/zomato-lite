// GET /api/restaurants/[id] — the "give me the restaurant page" side of the contract.
// The response is shaped like the screen, so the frontend has nothing to figure out:
// name, big average, topic mention counts, latest review, then the older list.
// Optional ?topic=Food narrows the REVIEW LIST only — averages/total stay whole.
// The frontend only renders.

import { getRestaurantPage } from "@/db/store";
import { TOPICS } from "@/lib/topics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurantId = Number(id);

  if (!Number.isInteger(restaurantId)) {
    return Response.json({ error: "Invalid restaurant id" }, { status: 400 });
  }

  // Optional topic filter (useful for direct links and the app's own chips).
  const topic = new URL(request.url).searchParams.get("topic");
  if (topic !== null && topic !== "" && !(TOPICS as readonly string[]).includes(topic)) {
    return Response.json(
      { error: `Unknown topic filter. Choose from ${TOPICS.join(", ")}` },
      { status: 400 }
    );
  }

  const page = await getRestaurantPage(restaurantId, topic || null);
  if (!page) {
    return Response.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Decision, stated out loud: when a restaurant has ZERO reviews yet,
  // averageRating is null (an average of nothing is not a number),
  // totalReviews is 0, latestReview is null, and reviews is [].
  // topicCounts counts MENTIONS at request time — a 1-star review mentioning
  // Food counts the same as a 5-star one. It is not a sentiment score.
  return Response.json(page);
}
