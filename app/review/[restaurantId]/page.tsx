// Screen 1 — /review/[restaurantId]
// A star picker, a comment box, a submit button. Nothing else.
// The frontend validates kindly (button disabled until valid), then steps back —
// the real rules live in the backend, and any error message shown is the backend's own.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the restaurant id from the URL, and ask the backend who we are reviewing
  // so the name at the top is real, not invented by the frontend.
  useEffect(() => {
    params.then(({ restaurantId }) => setRestaurantId(restaurantId));
  }, [params]);

  useEffect(() => {
    if (restaurantId === null) return;
    fetch(`/api/restaurants/${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name?: string } | null) => {
        if (data?.name) setRestaurantName(data.name);
      })
      .catch(() => undefined);
  }, [restaurantId]);

  const valid = restaurantId !== null && rating >= 1 && comment.trim().length > 0 && !submitting;

  async function submit() {
    if (restaurantId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: Number(restaurantId), rating, comment }),
      });
      if (res.ok) {
        // Success -> the backend saved it; the restaurant page will show it fresh.
        setSubmitting(false);
        router.push(`/restaurant/${restaurantId}`);
      } else {
        // Show the backend's error, not one I invented.
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
      }
    } catch {
      setError("Could not reach the server");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
      <div className="mx-auto max-w-[560px] px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          {restaurantName ?? "Loading…"}
        </h1>
        {restaurantName && <p className="mt-1 text-sm text-[#57534e]">Write a review</p>}

        {/* Star picker — 1 to 5, clear selected state */}
        <div className="mt-10" role="radiogroup" aria-label="Rating">
          <p className="text-sm font-medium">Rating</p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className={`h-11 w-11 rounded-lg border text-[15px] transition-colors ${
                  rating >= n
                    ? "border-[#c2410c] bg-[#c2410c] text-white"
                    : "border-[#e7e5e4] bg-white text-[#1a1a1a] hover:border-[#c2410c]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Comment box */}
        <div className="mt-8">
          <label htmlFor="comment" className="text-sm font-medium">
            Review
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was it?"
            rows={4}
            className="mt-2 w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-3 text-[15px] leading-7 outline-none focus:border-[#c2410c]"
          />
        </div>

        {error && <p className="mt-4 text-[15px] text-[#b91c1c]">{error}</p>}

        {/* Submit — disabled until a rating is picked and the comment is non-empty */}
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className={`mt-8 w-full rounded-lg px-5 py-3 text-[15px] text-white ${
            valid ? "bg-[#c2410c] hover:bg-[#9a3412]" : "cursor-not-allowed bg-[#d6d3d1]"
          }`}
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </main>
  );
}
