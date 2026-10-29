// Page 1 — Restaurant and reviews.
// Display layer: calls the API and prints what it was handed. No maths in this file.
// Structure: wordmark bar → white card (photo, name, rating badge, chips) →
// Topic mention chips (with "All" filter + a line clarifying counts ≠ sentiment) →
// Latest review card → Earlier reviews cards → Write a Review button.
// ?topic=Food in the URL swaps the LATEST/EARLIER split for a single filtered list.

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
  latestReview: Review | null;
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

        {/* Banner card: photograph, then name, average badge and cuisine chips */}
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
          <div className="px-6 pb-6 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-[#0F172A]">
                  {restaurant.name}
                </h1>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">{restaurant.area}</p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-md bg-[#F1EFEB] px-3 py-1 text-sm text-[#6B7280]">
                    {restaurant.cuisine}
                  </span>
                  <span className="rounded-md bg-[#F1EFEB] px-3 py-1 text-sm text-[#6B7280]">
                    Dine-in
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {restaurant.averageRating === null ? (
                  <span className="text-xl font-bold text-[#d6d3d1]">—</span>
                ) : (
                  <span className="inline-flex items-baseline">
                    <span className="rounded-lg bg-[#15803D] px-2.5 py-1.5 text-xl font-bold text-white">
                      {restaurant.averageRating}
                    </span>
                    <span className="ml-1 text-[15px] font-semibold text-[#6B7280]">/5</span>
                  </span>
                )}
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Based on {restaurant.totalReviews} review{restaurant.totalReviews === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Review categories: counts + filters. Deliberately labelled as tagged
            reviews, not sentiment — a category chip says how many reviews carry
            that tag, good reviews and bad reviews count equally. */}
        <section className="mt-4 rounded-2xl bg-white px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-[#6B7280]">
            REVIEW CATEGORIES
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/restaurant/${restaurant.id}`}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                topic === null ? "bg-[#24292E] text-white" : "bg-[#F1EFEB] text-[#24292E] hover:bg-[#E7E2DA]"
              }`}
            >
              All · {restaurant.totalReviews}
            </Link>
            {TOPICS.map((t) => (
              <Link
                key={t}
                href={`/restaurant/${restaurant.id}?topic=${t}`}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  topic === t
                    ? "bg-[#24292E] text-white"
                    : restaurant.topicCounts[t] > 0
                      ? "bg-[#F1EFEB] text-[#24292E] hover:bg-[#E7E2DA]"
                      : "bg-transparent text-[#9CA3AF] ring-1 ring-inset ring-[#ECE8E2]"
                }`}
              >
                {t} · {restaurant.topicCounts[t]}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-5 text-[#9CA3AF]">
            Filter reviews by category. A review can have more than one category.
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#9CA3AF]">
            Counts show how many reviews are tagged with each category — not whether reviewers liked it.
          </p>
          {restaurant.reviewsWithoutCategories > 0 && (
            <p className="mt-1 text-[12px] leading-5 text-[#9CA3AF]">
              Some reviews don&apos;t have categories yet.
            </p>
          )}
        </section>

        {/* Latest review — only in unfiltered view (a filter shows the matching list instead) */}
        {!topic && restaurant.latestReview && (
          <section>
            <p className="mt-6 text-[11px] font-semibold tracking-[0.15em] text-[#6B7280]">
              LATEST REVIEW
            </p>
            <div className="mt-2 rounded-2xl border-l-4 border-[#15803D] bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#E7F4EA] px-2 py-0.5 text-xs font-bold tracking-wide text-[#15803D]">
                    LATEST
                  </span>
                  <RatingBadge rating={restaurant.latestReview.rating} />
                </div>
                <span className="text-sm text-[#9CA3AF]">
                  {timeAgo(restaurant.latestReview.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-[15px] leading-7">{restaurant.latestReview.comment}</p>
              <TopicTags topics={restaurant.latestReview.topics} />
            </div>
          </section>
        )}

        {/* Earlier reviews, or — under a topic filter — every review mentioning it */}
        <section>
          <p className="mt-6 text-[11px] font-semibold tracking-[0.15em] text-[#6B7280]">
            {topic ? `REVIEWS TAGGED ${topic.toUpperCase()}` : "EARLIER REVIEWS"}
          </p>
          {restaurant.reviews.length === 0 && topic ? (
            <div className="mt-2 rounded-2xl border border-dashed border-[#d6d3d1] bg-white px-5 py-6 text-center text-[14px] text-[#6B7280]">
              No reviews mention {topic} yet. Try another topic.
            </div>
          ) : restaurant.reviews.length > 0 ? (
            <div className="mt-2 space-y-3">
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
          ) : null}
        </section>

        {/* Empty state inviting the first review */}
        {restaurant.totalReviews === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-[#d6d3d1] p-8 text-center">
            <p className="text-[15px] font-medium">No ratings yet</p>
            <p className="mt-1 text-[15px] text-[#6B7280]">
              Be the first to review {restaurant.name}.
            </p>
          </div>
        )}

        {/* Tomato-red primary action → review form for THIS restaurant */}
        <Link
          href={`/review/${restaurant.id}`}
          className="mt-6 block w-full rounded-xl bg-[#D92D2A] px-5 py-4 text-center text-[17px] font-semibold text-white hover:bg-[#B42318]"
        >
          Write a Review
        </Link>
      </div>
    </main>
  );
}
