// GET /api/restaurants/[id] — the "give me the restaurant page" side of the contract.
// The response is shaped like the screen, so the frontend has nothing to figure out:
// name, big average, latest review, then the older list. The frontend only renders.

import { getRestaurantPage } from "@/db/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurantId = Number(id);

  if (!Number.isInteger(restaurantId)) {
    return Response.json({ error: "Invalid restaurant id" }, { status: 400 });
  }

  const page = await getRestaurantPage(restaurantId);
  if (!page) {
    return Response.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Decision, stated out loud: when a restaurant has ZERO reviews yet,
  // averageRating is null (an average of nothing is not a number),
  // totalReviews is 0, latestReview is null, and reviews is [].
  // "What happens when there is nothing yet" is a product question you will
  // answer on every build — here we chose: show an empty state inviting the first review.
  return Response.json(page);
}
