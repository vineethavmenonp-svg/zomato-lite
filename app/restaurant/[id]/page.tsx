// Page 1 — Restaurant and reviews.
// Display layer: calls the API and prints what it was handed. No maths in this file.
// Structure: wordmark bar → white card (photo, name, location, cuisine, and a
// ★ rating · N reviews line with "Write a review" beside it) → Reviews heading
// with compact filter pills beneath it (no counts; selected filter highlighted;
// zero-count categories hidden, All always shown) → one consistent review list,
// newest first. ?topic=Food in the URL narrows the list; the headline rating
// is always over ALL reviews.

import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { Logo } from "@/app/logo";
import { TOPICS, type Topic } from "@/lib/topics";

type Review = { id: number; rating: number; comment: string; topics: string[]; createdAt: string };
type Overview = {
  id: number;
  name: string;
  cuisine: string;
  area: string;
  image: string | null;
  averageRating: number | null;
  totalReviews: number;
  reviewsWithoutCategories: number;
  topicCounts: Record<Topic, number>;
  reviews: Review[];
};

async function getRestaurantPage(id: string, topic: string | null) {
  // Build the API address from the request itself: on Vercel the host is the live
  // domain, on your laptop it is localhost:3000 — the page works on both.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  try {
    const res = await fetch(`${protocol}://${host}/api/restaurants/${id}${query}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Overview;
  } catch {
    return null;
  }
}

// Presentation-only: "1m ago" for fresh reviews, date for older ones.
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Green for 4–5, amber for 2–3, red for 1 — like real food apps' rating chips.
function badgeClass(rating: number) {
  if (rating >= 4) return "bg-[#15803D]";
  if (rating >= 2) return "bg-[#EAB308]";
  return "bg-[#DC2626]";
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg ${badgeClass(rating)} px-1 text-sm font-semibold text-white`}
    >
      {rating}
    </span>
  );
}

// The small topic tags printed on a review card. Neutral grey on purpose:
// a tag says the review touches on this topic, nothing about its sentiment.
function TopicTags({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {topics.map((t) => (
        <span
          key={t}
          className="rounded-md bg-[#F1EFEB] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  // An unknown ?topic falls back to "All" instead of showing an error page.
  const rawTopic = typeof sp.topic === "string" ? sp.topic : null;
  const topic: Topic | null = (TOPICS as readonly string[]).includes(rawTopic as Topic)
    ? (rawTopic as Topic)
    : null;

  const restaurant = await getRestaurantPage(id, topic);

  if (!restaurant) {
    return (
      <main className="min-h-screen bg-[#FAF8F4] text-[#24292E]">
        <div className="mx-auto max-w-[430px] px-4 pt-4">
          <Logo />
          <div className="rounded-2xl bg-white px-6 py-24 mt-4">
            <p className="text-[15px]">That restaurant does not exist.</p>
            <Link href="/restaurant/1" className="mt-4 inline-block text-[15px] text-[#E4572E] hover:underline">
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#24292E]">
      <div className="mx-auto max-w-[430px] px-4 pt-4 pb-12">
        {/* Wordmark bar */}
        <Logo />

        {/* Back navigation to the homepage listing */}
        <div className="mt-4">
          <Link href="/" className="text-sm font-medium text-[#E4572E] hover:underline">
            ← Back to restaurants
          </Link>
        </div>

        {/* Banner card: photograph, then name, location, cuisine, and the
            overall rating line with "Write a review" right beside it. */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white">
          {/* Banner: this restaurant's own image from the database, wide crop
              (object-cover + fixed height gives every photo the same banner shape) */}
          <Image
            src={
              restaurant.image ??
              "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=800&q=80&auto=format&fit=crop"
            }
            alt={`${restaurant.name} — food photograph`}
            width={800}
            height={480}
            priority
            sizes="(max-width: 480px) 100vw, 430px"
            className="h-[240px] w-full object-cover"
          />
          <div className="px-6 pb-5 pt-4">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#0F172A]">
              {restaurant.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">{restaurant.area}</p>
            <span className="mt-2.5 inline-block rounded-md bg-[#F1EFEB] px-3 py-1 text-sm text-[#6B7280]">
              {restaurant.cuisine}
            </span>
            {/* Overall rating + total as one line of real data, and the primary
                action directly beside it. Averages are ALWAYS over all reviews. */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {restaurant.averageRating === null ? (
                <p className="text-[15px] font-medium text-[#6B7280]">No ratings yet</p>
              ) : (
                <p className="items-baseline text-[15px]">
                  <span className="text-[#F5A623]" aria-hidden="true">★</span>{" "}
                  <span className="font-semibold text-[#0F172A]">{restaurant.averageRating}</span>
                  <span className="text-[#9CA3AF]"> · </span>
                  <span className="font-medium text-[#6B7280]">
                    {restaurant.totalReviews} review{restaurant.totalReviews === 1 ? "" : "s"}
                  </span>
                </p>
              )}
              <Link
                href={`/review/${restaurant.id}`}
                className="rounded-lg bg-[#D92D2A] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#B42318]"
              >
                Write a review
              </Link>
            </div>
          </div>
        </section>

        {/* Reviews: heading, compact filter pills (counts removed — the number
            a review carries is on its card), then one consistent list, newest
            first. Zero-count categories stay hidden; "All" is always shown. */}
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#0F172A]">Reviews</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Link
              href={`/restaurant/${restaurant.id}`}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                topic === null ? "bg-[#24292E] text-white" : "bg-[#F1EFEB] text-[#24292E] hover:bg-[#E7E2DA]"
              }`}
            >
              All
            </Link>
            {TOPICS.map((t) =>
              restaurant.topicCounts[t] > 0 || topic === t ? (
                <Link
                  key={t}
                  href={`/restaurant/${restaurant.id}?topic=${t}`}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    topic === t
                      ? "bg-[#24292E] text-white"
                      : "bg-[#F1EFEB] text-[#24292E] hover:bg-[#E7E2DA]"
                  }`}
                >
                  {t}
                </Link>
              ) : null,
            )}
          </div>
          {restaurant.reviewsWithoutCategories > 0 && (
            <p className="mt-2 text-[12px] leading-5 text-[#9CA3AF]">
              Some reviews don&apos;t have categories yet.
            </p>
          )}
          {topic && (
            <p className="mt-3 text-[14px] font-medium text-[#6B7280]">
              {restaurant.reviews.length} review{restaurant.reviews.length === 1 ? "" : "s"} about{" "}
              {topic.toLowerCase()}
            </p>
          )}

          {/* One list, newest first — same card for every review, filter or not */}
          {restaurant.reviews.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#d6d3d1] bg-white px-5 py-6 text-center text-[14px] text-[#6B7280]">
              {topic ? (
                <>No reviews about {topic.toLowerCase()} yet. Try another category.</>
              ) : (
                <>No ratings yet. Be the first to review {restaurant.name}.</>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {restaurant.reviews.map((review: Review) => (
                <div key={review.id} className="rounded-2xl bg-white px-5 py-4">
                  <div className="flex items-center justify-between">
                    <RatingBadge rating={review.rating} />
                    <span className="text-sm text-[#9CA3AF]">{timeAgo(review.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-7">{review.comment}</p>
                  <TopicTags topics={review.topics} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Subtle footer */}
        <p className="mt-10 text-center text-[11px] text-[#A8A29E]">
          Learning project · Sample restaurants and reviews
        </p>
      </div>
    </main>
  );
}
