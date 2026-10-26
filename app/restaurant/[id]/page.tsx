// Screen 2 — /restaurant/[id]
// The display layer. It calls the API and prints what it was handed.
// THE RULE: there is no arithmetic in this file. It receives 4.3 and prints 4.3.

import Link from "next/link";
import { headers } from "next/headers";

type Review = { id: number; rating: number; comment: string; createdAt: string };

async function getRestaurantPage(id: string) {
  // Build the API address from the request itself: on Vercel the host is the live
  // domain, on your laptop it is localhost:3000 — the page works on both.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  try {
    const res = await fetch(`${protocol}://${host}/api/restaurants/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
    name: string;
    cuisine: string;
    area: string;
    averageRating: number | null;
    totalReviews: number;
    latestReview: Review | null;
    reviews: Review[];
    };
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurantPage(id);

  if (!restaurant) {
    return (
      <main className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
        <div className="mx-auto max-w-[560px] px-6 py-24">
          <p className="text-[15px]">That restaurant does not exist.</p>
          <Link href="/" className="mt-4 inline-block text-[15px] text-[#c2410c] hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
      <div className="mx-auto max-w-[560px] px-6 py-16">
        {/* Name, with cuisine and area underneath in muted text */}
        <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-[#57534e]">
          {restaurant.cuisine} · {restaurant.area}
        </p>

        {/* Average rating — the biggest thing on the page. Printed verbatim from the API. */}
        <div className="mt-10 flex items-baseline gap-3">
          {restaurant.averageRating === null ? (
            <span className="text-6xl font-semibold text-[#d6d3d1]">—</span>
          ) : (
            <span className="text-6xl font-semibold tracking-tight">{restaurant.averageRating}</span>
          )}
          <span className="text-sm text-[#57534e]">
            {restaurant.totalReviews} review{restaurant.totalReviews === 1 ? "" : "s"}
          </span>
        </div>

        {/* Latest review, set apart from the rest */}
        {restaurant.latestReview && (
          <div className="mt-8 rounded-lg border border-[#f5d9c8] bg-[#fdf6f1] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#c2410c]">Latest review</p>
            <p className="mt-3 text-[15px] leading-7">{restaurant.latestReview.comment}</p>
            <p className="mt-3 text-sm text-[#57534e]">
              {restaurant.latestReview.rating} stars · {formatDate(restaurant.latestReview.createdAt)}
            </p>
          </div>
        )}

        {/* Older reviews, plain list */}
        {restaurant.reviews.length > 0 && (
          <ul className="mt-8 divide-y divide-[#e7e5e4] border-t border-[#e7e5e4]">
            {restaurant.reviews.map((review) => (
              <li key={review.id} className="py-4">
                <p className="text-[15px] leading-7">{review.comment}</p>
                <p className="mt-2 text-sm text-[#57534e]">
                  {review.rating} stars · {formatDate(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state inviting the first review */}
        {restaurant.totalReviews === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-[#d6d3d1] p-8 text-center">
            <p className="text-[15px] text-[#57534e]">No reviews yet.</p>
            <p className="mt-1 text-[15px] text-[#57534e]">Be the first to review {restaurant.name}.</p>
          </div>
        )}

        <Link
          href={`/review/${id}`}
          className="mt-10 inline-block rounded-lg bg-[#c2410c] px-5 py-3 text-[15px] text-white hover:bg-[#9a3412]"
        >
          Write a review
        </Link>
      </div>
    </main>
  );
}
