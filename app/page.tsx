// Homepage — app-like restaurant list, mobile-first.
// Full width on phones, centred narrow column (430px) on desktop.
// Row = 76px photo · name/cuisine/area · rating badge + review count.
// Unrated restaurants show "No ratings yet" below the details (right side stays free).

import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/app/logo";

type Overview = {
  id: number;
  name: string;
  cuisine: string;
  area: string;
  image: string | null;
  averageRating: number | null; // null = no ratings yet
  totalReviews: number;
};

async function getList() {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  try {
    const res = await fetch(`${protocol}://${host}/api/restaurants`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { restaurants: Overview[] }).restaurants;
  } catch {
    return null;
  }
}

export default async function Homepage() {
  const restaurants = await getList();

  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#24292E]">
      {/* Full width on phones; on desktop the phone-width column is centred */}
      <div className="mx-auto w-full max-w-[430px] px-4 pt-3 pb-8">
        <Logo />

        <div className="mt-3 px-1">
          <h1 className="text-[16px] font-semibold tracking-tight">Restaurants near you</h1>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">Browse, rate, and review. Demo app.</p>
        </div>

        {/* Vertical list — subtle separators, compact tappable rows */}
        <div className="mt-2 divide-y divide-[#ECE8E2] rounded-xl bg-white px-3">
          {restaurants?.map((r) => (
            <Link
              key={r.id}
              href={`/restaurant/${r.id}`}
              className="group flex items-center gap-3 px-0 py-2.5"
            >
              {/* 76px food thumbnail, left */}
              <Image
                src={
                  r.image ??
                  "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=800&q=80&auto=format&fit=crop"
                }
                alt={r.name}
                width={152}
                height={152}
                className="h-[76px] w-[76px] shrink-0 rounded-lg object-cover"
              />
              {/* Name / cuisine / location — middle */}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[17px] font-semibold leading-[22px] group-hover:text-[#E4572E]">
                  {r.name}
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">{r.cuisine}</p>
                <p className="mt-0.5 truncate text-[13px] text-[#9CA3AF]">{r.area}</p>
                {/* "No ratings yet" sits below the details when there is no rating to show */}
                {r.averageRating === null && (
                  <span className="mt-1.5 inline-block rounded-md bg-[#F1EFEB] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                    No ratings yet
                  </span>
                )}
              </div>
              {/* Rating badge + review count — right (rated only) */}
              {r.averageRating !== null && (
                <div className="shrink-0 text-right">
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[#15803D] px-2 py-1 text-[13px] font-bold text-white">
                    {r.averageRating}
                    <span className="text-[10px] font-medium opacity-90">/5</span>
                  </span>
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">
                    {r.totalReviews} review{r.totalReviews === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </Link>
          )) || (
            <p className="py-4 text-[15px] text-[#6B7280]">Loading restaurants…</p>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-[#9CA3AF]">
          Demo app · Fictional restaurants shown for learning purposes
        </p>
      </div>
    </main>
  );
}
