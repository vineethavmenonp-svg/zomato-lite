// Page 2 — Write a review.
// Frontend validation is kindness (button disabled until valid); the real rules
// live in the backend, and any error shown is the backend's own message.
// Structure: wordmark bar → white card: "WRITING A REVIEW FOR" name → Rate it
// (five star buttons) → Your review text box with counter → Topics (optional,
// suggested from the reviewer's own words, editable by tapping) → Submit.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/app/logo";
import { TOPICS, suggestTopics, type Topic } from "@/lib/topics";

const MAX_COMMENT = 500;

// Suggestion model (the whole feature in one place). The ticked chips are
// DERIVED on every render — no separate sync pass, nothing to get stale:
//   autoSuggested: what the words currently imply
//     - matching keyword categories pre-tick, live as typing changes them
//     - a non-empty comment matching NOTHING suggests "Others" instead,
//       with the note "You can change the suggested category."
//     - an empty comment suggests nothing at all
//   manual: the reviewer's own picks — always shown, never withdrawn
//   dismissedRef: suggestions the reviewer unticked — never re-ticked this session
//   displayed = reviewer's picks ∪ (autoSuggested − dismissed), Others stands
//   down automatically the moment a more suitable category is chosen
export default function ReviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  // Categories the reviewer personally ticked.
  const [manual, setManual] = useState<Topic[]>([]);
  // Suggestions the reviewer unticked — never re-selected this session.
  const dismissedRef = useRef<Set<Topic>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = comment.trim();

  // Keyword matches in the current words (always within the four content categories).
  const matched = useMemo(() => suggestTopics(comment.trim()), [comment]);

  // What we think SHOULD be auto-ticked right now.
  const autoSuggested = useMemo<Topic[]>(() => {
    const t = comment.trim();
    const manualContent = manual.filter((x) => x !== "Others");
    if (matched.length > 0 || manualContent.length > 0) return [...new Set(matched)];
    // No matches and nothing chosen: Others — only ever for non-empty comments.
    return t ? ["Others"] : [];
  }, [matched, manual, comment]);

  // The final chip state, recomputed fresh each render.
  const selected = useMemo<Topic[]>(() => {
    const set = new Set(manual);
    for (const t of autoSuggested) {
      if (!dismissedRef.current.has(t)) set.add(t);
    }
    return [...set];
  }, [manual, autoSuggested]);

  function toggle(topic: Topic) {
    const on = selected.includes(topic);
    if (on) {
      // The reviewer's removal wins over our suggestions, permanently.
      setManual((prev) => prev.filter((t) => t !== topic));
      if (autoSuggested.includes(topic)) dismissedRef.current.add(topic);
    } else {
      dismissedRef.current.delete(topic);
      setManual((prev) => (prev.includes(topic) ? prev : [...prev, topic]));
    }
  }

  // Filled star — amber when a button is selected, silver-grey when not.
  function Star({ selected: on }: { selected: boolean }) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`h-7 w-7 ${on ? "fill-[#F5A623]" : "fill-[#C4C8CC]"}`}
        aria-hidden="true"
      >
        <path d="M12 2.5l2.9 6.06 6.66.86-4.88 4.62 1.25 6.59L12 17.43l-5.93 3.2 1.25-6.59-4.88-4.62 6.66-.86L12 2.5z" />
      </svg>
    );
  }

  // Resolve the restaurant id from the URL, and ask the backend for the real name.
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

  const othersIsSuggestion =
    autoSuggested.length === 1 && autoSuggested[0] === "Others" && trimmed.length > 0;

  const valid = restaurantId !== null && rating >= 1 && trimmed.length > 0 && !submitting;

  async function submit() {
    if (restaurantId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Final selected categories go in as-is (empty list = no categories —
        // allowed). The backend validates every value before saving.
        body: JSON.stringify({ restaurantId: Number(restaurantId), rating, comment, topics: selected }),
      });
      if (res.ok) {
        // Success → back to Page 1, which shows updated reviews, ratings and
        // topic mention counts, computed fresh by the backend from the database.
        setSubmitting(false);
        router.push(`/restaurant/${restaurantId}`);
      } else {
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
    <main className="min-h-screen bg-[#FAF8F4] text-[#24292E]">
      <div className="mx-auto max-w-[430px] px-4 pt-4 pb-12">
        {/* Wordmark bar */}
        <Logo />

        {/* Back navigation to Page 1 for this restaurant */}
        <div className="mt-4">
          <a href={`/restaurant/${restaurantId ?? ""}`} className="text-sm font-medium text-[#E4572E] hover:underline">
            ← Back to restaurant
          </a>
        </div>

        {/* Card */}
        <section className="mt-4 rounded-2xl bg-white px-8 py-8">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-[#6B7280]">
            WRITING A REVIEW FOR
          </p>
          <h1 className="mt-1 text-[18px] font-semibold tracking-tight text-[#0F172A]">
            {restaurantName ?? "Loading…"}
          </h1>

          {/* Rate it — five star buttons, clear selected state */}
          <p className="mt-6 text-[15px] font-semibold">Rate it</p>
          <div className="mt-3 flex gap-3" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className={`inline-flex h-16 w-16 items-center justify-center rounded-xl border transition-colors ${
                  rating >= n
                    ? "border-[#F5A623] bg-[#FEF6E0]"
                    : "border-transparent bg-[#F6F6F5] hover:border-[#F5A623]"
                }`}
              >
                <Star selected={rating >= n} />
              </button>
            ))}
          </div>

          {/* Your review — text box with a live character counter */}
          <p className="mt-6 text-[15px] font-semibold">Your review</p>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="How was it?"
            rows={5}
            className="mt-3 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[15px] leading-7 outline-none focus:border-[#F5A623]"
          />
          <p className="mt-1 text-right text-[12px] text-[#6B7280]" aria-live="polite">
            {comment.length}/{MAX_COMMENT}
          </p>

          {/* Categories — optional, editable selections. Order of the form:
              rating → review → suggested categories → submit. Auto suggestions
              pre-tick from the words typed (dashed ring while they are only
              suggestions); manual picks and removals are respected. */}
          <p className="mt-6 text-[15px] font-semibold">
            Suggested categories <span className="text-[12px] font-normal text-[#9CA3AF]">(optional)</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const on = selected.includes(t);
              const isAutoSuggestion = on && autoSuggested.includes(t) && !manual.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Topic ${t}${isAutoSuggestion ? " (suggested)" : ""}`}
                  onClick={() => toggle(t)}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    on
                      ? isAutoSuggestion
                        ? "bg-[#EDE2DA] text-[#B42318] ring-1 ring-dashed ring-[#E4572E]"
                        : "bg-[#EDE2DA] text-[#B42318] ring-1 ring-[#E4572E]"
                      : "bg-[#F6F6F5] text-[#6B7280] ring-1 ring-transparent hover:ring-[#E5E7EB]"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {t}
                </button>
              );
            })}
          </div>
          {othersIsSuggestion && (
            <p className="mt-2 text-[12px] leading-5 text-[#B45309]" aria-live="polite">
              You can change the suggested category.
            </p>
          )}
          <p className="mt-2 text-[12px] leading-5 text-[#9CA3AF]">
            You can change these.
          </p>

          {error && <p className="mt-3 text-[15px] text-[#B42318]">{error}</p>}

          {/* Submit Review — disabled until a rating is picked and the comment is non-empty */}
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className={`mt-4 w-full rounded-xl px-5 py-4 text-[17px] font-semibold text-white transition-colors ${
              valid ? "bg-[#D92D2A] hover:bg-[#B42318]" : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </section>

        {/* Subtle footer */}
        <p className="mt-8 text-center text-[11px] text-[#A8A29E]">
          Learning project · Sample restaurants and reviews
        </p>
      </div>
    </main>
  );
}
