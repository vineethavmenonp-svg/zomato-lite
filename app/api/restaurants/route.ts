// GET /api/restaurants — the list side of the contract, shaped like the homepage:
// every restaurant, each with its own separately computed average and count.

import { getRestaurantsOverview } from "@/db/store";

export async function GET() {
  const restaurants = await getRestaurantsOverview();
  return Response.json({ restaurants });
}
