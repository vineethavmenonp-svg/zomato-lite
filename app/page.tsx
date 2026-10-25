import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
      <div className="mx-auto max-w-[560px] px-6 py-24">
        <h1 className="text-2xl font-semibold tracking-tight">Zomato Lite</h1>
        <p className="mt-3 text-[15px] leading-7 text-[#57534e]">
          One restaurant. Two things you can do.
        </p>
        <div className="mt-10 space-y-3">
          <Link
            href="/restaurant/1"
            className="block rounded-lg border border-[#e7e5e4] bg-white px-5 py-4 text-[15px] hover:border-[#c2410c]"
          >
            Ludhiana Burrito — see the restaurant page
          </Link>
          <Link
            href="/review/1"
            className="block rounded-lg border border-[#e7e5e4] bg-white px-5 py-4 text-[15px] hover:border-[#c2410c]"
          >
            Write a review
          </Link>
        </div>
      </div>
    </main>
  );
}
